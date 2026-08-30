"use server";

import { logAdminAction } from "@/lib/audit/log-admin-action";
import { logFinanceAdminAction } from "@/lib/auth/finance-guards";
import { checkStaffAnyPermission, checkStaffPermission } from "@/lib/auth/staff-guards";
import { reverseCreatorEarningForQualityRefund } from "@/lib/finance/create-creator-revenue-adjustment";
import { createNotification } from "@/lib/notifications/create-notification";
import { processRefundAction as legacyProcessRefund } from "@/lib/monetization/refunds";
import { createClient } from "@/lib/data/server";
import {
  appendRefundInternalNote,
  createRefundRecord,
  findCompletedRefundByOriginalTransaction,
  getRefundById,
  updateRefundStatus
} from "@/lib/data/refunds";
import { getTransactionById } from "@/lib/data/transactions";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import { creditUserCoins } from "@/lib/wallets/user-wallet";
import { inferRefundTypeFromTransaction } from "@/lib/admin/refunds/refund-labels";
import type {
  CreateManualRefundPayload,
  RefundPreviewImpact,
  RefundStatus
} from "@/types/admin-refund";

function toNumber(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getWalletBalance(userId: string) {
  const db = await createClient();
  const { data } = await db
    .from("user_wallets")
    .select("paid_coin_balance, bonus_coin_balance")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    paid: toNumber(data?.paid_coin_balance),
    bonus: toNumber(data?.bonus_coin_balance),
    total: toNumber(data?.paid_coin_balance) + toNumber(data?.bonus_coin_balance)
  };
}

async function estimateCreatorReversalVnd(originalTxId: string) {
  const db = await createClient();
  const { data } = await db
    .from("creator_earning_transactions")
    .select("creator_net_amount_vnd, status")
    .eq("source_type", "transaction")
    .eq("source_id", originalTxId)
    .maybeSingle();
  if (!data || data.status === "refunded") return 0;
  return toNumber(data.creator_net_amount_vnd);
}

export async function previewRefundImpact(
  payload: Partial<CreateManualRefundPayload>
): Promise<{ data: RefundPreviewImpact | null; error: string | null }> {
  const auth = await checkStaffAnyPermission(["finance.refund.create", "finance.refund.view"]);
  if (!auth.ok) return { data: null, error: auth.error };

  const warnings: string[] = [];
  const ledgerEntries: RefundPreviewImpact["ledgerEntries"] = [];

  if (!payload.originalTransactionId) {
    return {
      data: {
        buyerCreditCoin: 0,
        buyerCreditPaidCoin: 0,
        buyerCreditBonusCoin: 0,
        creatorRevenueReversalVnd: 0,
        platformRevenueReversalVnd: 0,
        ledgerEntries: [],
        warnings: ["Thiếu giao dịch gốc."],
        canSubmit: false
      },
      error: null
    };
  }

  const original = await getTransactionById(payload.originalTransactionId);
  if (!original.data) return { data: null, error: original.error };

  const coinAmount = toNumber(payload.coinAmount) || toNumber(original.data.coin_amount);
  const maxCoin = toNumber(original.data.coin_amount);
  if (coinAmount <= 0) warnings.push("Số coin hoàn phải lớn hơn 0.");
  if (coinAmount > maxCoin) warnings.push(`Số coin hoàn vượt quá giao dịch gốc (${maxCoin}).`);

  const existing = await findCompletedRefundByOriginalTransaction(original.data.id);
  if (existing && !payload.overrideDuplicate) {
    warnings.push("Giao dịch đã có refund đang xử lý hoặc hoàn tất.");
  }

  let paidCredit = 0;
  let bonusCredit = 0;
  const coinType = payload.coinType ?? "all";
  const paidOrig = toNumber(original.data.paid_coin_amount);
  const bonusOrig = toNumber(original.data.bonus_coin_amount);

  if (payload.creditBuyerWallet !== false) {
    if (coinType === "paid_coin") {
      paidCredit = Math.min(coinAmount, paidOrig || coinAmount);
    } else if (coinType === "bonus_coin") {
      bonusCredit = Math.min(coinAmount, bonusOrig || coinAmount);
    } else {
      paidCredit = paidOrig > 0 ? Math.min(coinAmount, paidOrig) : coinAmount;
      bonusCredit = Math.max(0, coinAmount - paidCredit);
    }

    if (paidCredit > 0) {
      ledgerEntries.push({
        type: "refund_credit",
        direction: "credit",
        amount: paidCredit,
        coinType: "paid",
        target: "buyer_wallet"
      });
    }
    if (bonusCredit > 0) {
      ledgerEntries.push({
        type: "refund_credit",
        direction: "credit",
        amount: bonusCredit,
        coinType: "bonus",
        target: "buyer_wallet"
      });
    }
  }

  const creatorReversal =
    payload.reverseCreatorRevenue !== false
      ? await estimateCreatorReversalVnd(original.data.id)
      : 0;
  if (creatorReversal > 0) {
    ledgerEntries.push({
      type: "creator_revenue_reversal",
      direction: "debit",
      amount: creatorReversal,
      target: "creator_wallet"
    });
  }

  if (payload.userId) {
    const balance = await getWalletBalance(payload.userId);
    if (original.data.type === "coin_purchase" && coinAmount > balance.total) {
      warnings.push("Hoàn mua coin có thể làm âm số dư ví người dùng.");
    }
  }

  if (!String(payload.reasonPublic ?? "").trim()) {
    warnings.push("Thiếu lý do hoàn tiền.");
  }

  return {
    data: {
      buyerCreditCoin: paidCredit + bonusCredit,
      buyerCreditPaidCoin: paidCredit,
      buyerCreditBonusCoin: bonusCredit,
      creatorRevenueReversalVnd: creatorReversal,
      platformRevenueReversalVnd: 0,
      ledgerEntries,
      warnings,
      canSubmit: warnings.filter((w) => !w.includes("vượt quá")).length === 0 && coinAmount > 0
    },
    error: null
  };
}

async function creditBuyerForRefund(input: {
  userId: string;
  coinAmount: number;
  coinType: string;
  paidOrig: number;
  bonusOrig: number;
  refundId: string;
  originalTxId: string;
}) {
  let paidCredit = 0;
  let bonusCredit = 0;

  if (input.coinType === "paid_coin") {
    paidCredit = input.coinAmount;
  } else if (input.coinType === "bonus_coin") {
    bonusCredit = input.coinAmount;
  } else {
    paidCredit = input.paidOrig > 0 ? Math.min(input.coinAmount, input.paidOrig) : input.coinAmount;
    bonusCredit = Math.max(0, input.coinAmount - paidCredit);
  }

  const metadata = {
    refund_record_id: input.refundId,
    original_transaction_id: input.originalTxId,
    ledger_type: "refund_credit"
  };

  if (paidCredit > 0) {
    const credit = await creditUserCoins({
      userId: input.userId,
      amount: paidCredit,
      coinType: "paid",
      reason: "refund",
      source: "refund",
      transactionCode: buildTransactionCode("RFCR"),
      metadata
    });
    if (!credit.data) throw new Error(credit.error ?? "Không thể hoàn paid coin.");
  }
  if (bonusCredit > 0) {
    const credit = await creditUserCoins({
      userId: input.userId,
      amount: bonusCredit,
      coinType: "bonus",
      reason: "refund",
      source: "refund",
      transactionCode: buildTransactionCode("RFCR"),
      metadata
    });
    if (!credit.data) throw new Error(credit.error ?? "Không thể hoàn bonus coin.");
  }
}

async function revokeChapterUnlock(userId: string, chapterId: string | null) {
  if (!chapterId) return;
  const db = await createClient();
  await db
    .from("chapter_unlocks")
    .update({ refund_status: "fully_refunded" })
    .eq("user_id", userId)
    .eq("chapter_id", chapterId);
}

async function notifyRefundCompleted(input: {
  buyerUserId: string | null;
  creatorUserId: string | null;
  coinAmount: number;
  contentLabel: string;
  notifyBuyer: boolean;
  notifyCreator: boolean;
}) {
  if (input.notifyBuyer && input.buyerUserId) {
    await createNotification(input.buyerUserId, "coin_refund", {
      title: "Hoàn coin thành công",
      body: `Bạn đã được hoàn ${input.coinAmount} coin cho giao dịch ${input.contentLabel}.`,
      targetType: "wallet",
      actionUrl: "/wallet"
    });
  }
  if (input.notifyCreator && input.creatorUserId) {
    await createNotification(input.creatorUserId, "content_quality_monetization_disabled", {
      title: "Doanh thu được điều chỉnh",
      body: `Một giao dịch liên quan đến nội dung ${input.contentLabel} đã được hoàn. Doanh thu tương ứng đã được điều chỉnh.`,
      targetType: "story",
      actionUrl: "/studio/finance"
    });
  }
}

export async function completeRefundRecord(refundId: string, options?: {
  notifyBuyer?: boolean;
  notifyCreator?: boolean;
  revokeAccess?: boolean;
}) {
  const auth = await checkStaffAnyPermission(["finance.refund.complete", "finance.refund.create"]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const refund = await getRefundById(refundId);
  if (!refund.data) return { ok: false, error: refund.error };
  if (refund.data.status === "completed") {
    return { ok: false, error: "Refund đã hoàn tất." };
  }
  if (!["approved", "processing"].includes(refund.data.status)) {
    return { ok: false, error: "Refund phải ở trạng thái đã duyệt hoặc đang xử lý." };
  }

  const existing = await findCompletedRefundByOriginalTransaction(refund.data.originalTransactionId);
  if (existing && existing.id !== refund.data.id) {
    const canOverride = await checkStaffPermission("finance.refund.override");
    if (!canOverride.ok) {
      return { ok: false, error: "Giao dịch đã có refund hoàn tất. Cần quyền override." };
    }
  }

  const original = await getTransactionById(refund.data.originalTransactionId);
  if (!original.data) return { ok: false, error: original.error };

  const isCoinPurchase = original.data.type === "coin_purchase";

  try {
    if (isCoinPurchase) {
      const legacy = await legacyProcessRefund(refundId);
      if (!legacy.ok) return legacy;
    } else if (refund.data.userId && toNumber(refund.data.coinAmount) > 0) {
      await creditBuyerForRefund({
        userId: refund.data.userId,
        coinAmount: toNumber(refund.data.coinAmount),
        coinType: refund.data.coinType ?? "all",
        paidOrig: toNumber(original.data.paid_coin_amount),
        bonusOrig: toNumber(original.data.bonus_coin_amount),
        refundId: refund.data.id,
        originalTxId: original.data.id
      });

      if (options?.revokeAccess) {
        await revokeChapterUnlock(refund.data.userId, refund.data.chapterId);
      }

      const meta = refund.data.metadata ?? {};
      if (meta.reverse_creator_revenue !== false && refund.data.chapterId) {
        const db = await createClient();
        const { data: unlock } = await db
          .from("chapter_unlocks")
          .select("id")
          .eq("user_id", refund.data.userId)
          .eq("chapter_id", refund.data.chapterId)
          .maybeSingle();
        if (unlock?.id) {
          await reverseCreatorEarningForQualityRefund({
            unlockId: unlock.id as string,
            batchId: refund.data.id,
            storyId: refund.data.storyId ?? original.data.story_id ?? "",
            chapterId: refund.data.chapterId
          });
        }
      }

      await updateRefundStatus({
        refundId,
        status: "completed",
        completedBy: auth.userId
      });
    } else {
      const legacy = await legacyProcessRefund(refundId);
      if (!legacy.ok) return legacy;
      return { ok: true, error: null };
    }

    await logFinanceAdminAction({
      action: "refund_completed",
      targetType: "refund",
      targetId: refundId,
      metadata: {
        refund_id: refundId,
        original_transaction_id: original.data.id,
        user_id: refund.data.userId,
        coin_amount: refund.data.coinAmount
      }
    });

    await logAdminAction({
      actorId: auth.userId,
      action: "refund_completed",
      targetType: "refund",
      targetId: refundId,
      metadata: {
        old_status: refund.data.status,
        new_status: "completed",
        amount: refund.data.coinAmount
      }
    });

    const contentLabel =
      refund.data.storyId ?? refund.data.chapterId ?? original.data.id.slice(0, 8);
    await notifyRefundCompleted({
      buyerUserId: refund.data.userId,
      creatorUserId: refund.data.creatorUserId,
      coinAmount: toNumber(refund.data.coinAmount),
      contentLabel,
      notifyBuyer: options?.notifyBuyer !== false,
      notifyCreator: options?.notifyCreator !== false
    });

    return { ok: true, error: null };
  } catch (err) {
    await updateRefundStatus({
      refundId,
      status: "failed",
      processedBy: auth.userId,
      failureReason: err instanceof Error ? err.message : "Lỗi xử lý hoàn tiền."
    });
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi xử lý hoàn tiền." };
  }
}

export async function createManualRefundRecord(payload: CreateManualRefundPayload) {
  const auth = await checkStaffPermission("finance.refund.create");
  if (!auth.ok) return { ok: false, error: auth.error, data: null };

  const preview = await previewRefundImpact(payload);
  if (!preview.data?.canSubmit) {
    return {
      ok: false,
      error: preview.data?.warnings.join(" ") ?? "Dữ liệu không hợp lệ.",
      data: null
    };
  }

  const original = await getTransactionById(payload.originalTransactionId);
  if (!original.data) return { ok: false, error: original.error, data: null };

  if (payload.overrideDuplicate) {
    const canOverride = await checkStaffPermission("finance.refund.override");
    if (!canOverride.ok) {
      return { ok: false, error: "Cần quyền override để hoàn trùng giao dịch.", data: null };
    }
  }

  const created = await createRefundRecord({
    originalTransactionId: original.data.id,
    userId: payload.userId || original.data.user_id,
    creatorUserId: original.data.creator_user_id,
    storyId: original.data.story_id,
    chapterId: original.data.chapter_id,
    amountVnd: original.data.money_amount_vnd,
    coinAmount: payload.coinAmount,
    refundType: payload.refundType || inferRefundTypeFromTransaction(original.data.type),
    source: "admin_manual",
    coinType: payload.coinType,
    reasonPublic: payload.reasonPublic,
    reasonInternal: payload.reasonInternal ?? null,
    createdBy: auth.userId,
    isHighRisk: preview.data.warnings.some((w) => w.includes("âm")),
    status: "pending",
    metadata: {
      credit_buyer_wallet: payload.creditBuyerWallet,
      reverse_creator_revenue: payload.reverseCreatorRevenue,
      keep_content_unlocked: payload.keepContentUnlocked,
      revoke_content_access: payload.revokeContentAccess,
      notify_buyer: payload.notifyBuyer,
      notify_creator: payload.notifyCreator,
      override_duplicate: payload.overrideDuplicate ?? false,
      override_reason: payload.overrideReason ?? null
    }
  });

  if (!created.data) return { ok: false, error: created.error, data: null };

  await logFinanceAdminAction({
    action: "refund_created",
    targetType: "refund",
    targetId: created.data.id,
    metadata: {
      refund_id: created.data.id,
      original_transaction_id: original.data.id,
      user_id: payload.userId,
      coin_amount: payload.coinAmount,
      reason: payload.reasonPublic
    }
  });

  await logAdminAction({
    actorId: auth.userId,
    action: "refund_created",
    targetType: "refund",
    targetId: created.data.id,
    metadata: {
      refund_type: payload.refundType,
      source: "admin_manual",
      amount: payload.coinAmount
    }
  });

  return { ok: true, error: null, data: created.data };
}

export async function transitionRefundStatus(input: {
  refundId: string;
  status: RefundStatus;
  reason?: string | null;
  internalNote?: string | null;
}) {
  const permissionMap: Record<string, string[]> = {
    reviewing: ["finance.refund.approve", "finance.refund.create"],
    approved: ["finance.refund.approve", "finance.refund.create"],
    processing: ["finance.refund.complete", "finance.refund.create"],
    rejected: ["finance.refund.reject", "finance.refund.create"],
    failed: ["finance.refund.complete", "finance.refund.create"],
    cancelled: ["finance.refund.reject", "finance.refund.create"]
  };

  const perms = permissionMap[input.status] ?? ["finance.refund.create"];
  const auth = await checkStaffAnyPermission(perms as Parameters<typeof checkStaffAnyPermission>[0]);
  if (!auth.ok) return { ok: false, error: auth.error };

  const current = await getRefundById(input.refundId);
  if (!current.data) return { ok: false, error: current.error };

  const updated = await updateRefundStatus({
    refundId: input.refundId,
    status: input.status,
    reviewedBy: ["approved", "reviewing", "processing", "rejected"].includes(input.status)
      ? auth.userId
      : undefined,
    processedBy: auth.userId,
    completedBy: input.status === "completed" ? auth.userId : undefined,
    failureReason: input.reason ?? undefined,
    reasonInternal: input.internalNote ?? undefined
  });

  if (!updated.data) return { ok: false, error: updated.error };

  await logAdminAction({
    actorId: auth.userId,
    action: `refund_${input.status}`,
    targetType: "refund",
    targetId: input.refundId,
    metadata: {
      old_status: current.data.status,
      new_status: input.status,
      reason: input.reason,
      refund_id: input.refundId,
      transaction_id: current.data.originalTransactionId,
      affected_user_id: current.data.userId
    }
  });

  if (input.status === "rejected" && current.data.userId && input.reason) {
    await createNotification(current.data.userId, "coin_refund", {
      title: "Yêu cầu hoàn coin bị từ chối",
      body: input.reason,
      targetType: "wallet"
    });
  }

  if (input.status === "completed") {
    return completeRefundRecord(input.refundId);
  }

  return { ok: true, error: null };
}

export async function addRefundInternalNoteAction(refundId: string, note: string) {
  const auth = await checkStaffAnyPermission(["finance.refund.create", "finance.refund.view"]);
  if (!auth.ok) return { ok: false, error: auth.error };
  const result = await appendRefundInternalNote(refundId, note, auth.userId);
  if (!result.data) return { ok: false, error: result.error };
  await logAdminAction({
    actorId: auth.userId,
    action: "refund_note_added",
    targetType: "refund",
    targetId: refundId,
    metadata: { note }
  });
  return { ok: true, error: null };
}
