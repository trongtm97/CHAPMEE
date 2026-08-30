"use server";

import { logFinanceAdminAction } from "@/lib/auth/finance-guards";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { applyUserCoinLedgerRecord } from "@/lib/data/wallets";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import { updateUserSubscriptionStatus } from "@/lib/data/vip";
import { createRiskEventRecord, getOrCreateUserRiskProfile, updateUserRiskProfileRecord } from "@/lib/data/risk";
import {
  createRefundRecord,
  findProcessedRefundByOriginalTransaction,
  getRefundById,
  updateRefundStatus
} from "@/lib/data/refunds";
import { getTransactionById } from "@/lib/data/transactions";
import { createRefundTransaction } from "@/lib/transactions/reversal";
import { shiftCreatorWalletBalances } from "@/lib/data/payouts";
import { createClient } from "@/lib/data/server";

function asNumber(v: number | null | undefined) {
  return Number.isFinite(v ?? NaN) ? Number(v) : 0;
}

async function assertRefundStaff() {
  return checkStaffPermission("finance.refund.create");
}

export async function createManualRefundAction(input: {
  originalTransactionId: string;
  reason?: string | null;
  provider?: string | null;
  providerReference?: string | null;
}) {
  const auth = await assertRefundStaff();
  if (!auth.ok) return { ok: false, error: auth.error, data: null };
  if (!String(input.reason ?? "").trim()) {
    return { ok: false, error: "Vui lòng nhập lý do refund.", data: null };
  }
  const original = await getTransactionById(input.originalTransactionId);
  if (!original.data) return { ok: false, error: original.error, data: null };

  const created = await createRefundRecord({
    originalTransactionId: original.data.id,
    userId: original.data.user_id,
    amountVnd: original.data.money_amount_vnd,
    coinAmount: original.data.coin_amount,
    reason: input.reason ?? null,
    provider: input.provider ?? null,
    providerReference: input.providerReference ?? null,
    createdBy: auth.userId
  });
  if (!created.data) return { ok: false, error: created.error, data: null };

  await logFinanceAdminAction({
    action: "refund_created",
    targetType: "refund",
    targetId: created.data.id,
    metadata: {
      original_transaction_id: original.data.id,
      user_id: original.data.user_id,
      amount_vnd: original.data.money_amount_vnd,
      coin_amount: original.data.coin_amount,
      reason: input.reason
    }
  });

  return { ok: true, error: null, data: created.data };
}

async function cancelVipIfMatched(originalTxId: string) {
  const db = await createClient();
  const { data: sub } = await db
    .from("user_subscriptions")
    .select("id")
    .eq("transaction_id", originalTxId)
    .eq("status", "active")
    .maybeSingle();
  if (!sub?.id) return;
  await updateUserSubscriptionStatus(String(sub.id), "cancelled");
}

async function cancelFanClubIfMatched(originalTxId: string) {
  const db = await createClient();
  const { data } = await db
    .from("fan_club_memberships")
    .update({ status: "cancelled" })
    .eq("transaction_id", originalTxId)
    .eq("status", "active")
    .select("id, creator_user_id");
  if (!data) return;
  for (const row of data as Array<{ id: string; creator_user_id: string }>) {
    await createRiskEventRecord({
      creatorUserId: row.creator_user_id,
      eventType: "fan_club_refund_revenue_review",
      severity: "medium",
      riskScore: 55,
      reason: "Fan club membership đã bị refund, cần review clawback creator revenue.",
      metadata: { membership_id: row.id, original_transaction_id: originalTxId }
    });
  }
}

async function lockCreatorRevenueIfTraceable(originalTxId: string) {
  const db = await createClient();
  const { data } = await db
    .from("transactions")
    .select("id, creator_user_id, money_amount_vnd, metadata")
    .eq("type", "creator_revenue_share")
    .contains("metadata", { transaction_id: originalTxId })
    .limit(20);
  if (!data) return;
  for (const row of data as Array<{ id: string; creator_user_id: string | null; money_amount_vnd: number | null }>) {
    if (!row.creator_user_id) continue;
    const amount = asNumber(row.money_amount_vnd);
    if (amount <= 0) continue;
    const shifted = await shiftCreatorWalletBalances({
      creatorUserId: row.creator_user_id,
      from: "pending",
      to: "locked",
      amountVnd: Math.min(amount, amount)
    });
    if (!shifted.data) {
      await createRiskEventRecord({
        creatorUserId: row.creator_user_id,
        transactionId: row.id,
        eventType: "creator_clawback_manual_review",
        severity: "high",
        riskScore: 80,
        reason: "Không thể auto lock creator revenue khi refund, cần admin review.",
        metadata: { original_transaction_id: originalTxId }
      });
    }
  }
}

async function debitUserCoinForRefund(input: {
  userId: string;
  amount: number;
  originalTransactionId: string;
}) {
  const db = await createClient();
  const { data: wallet } = await db
    .from("user_wallets")
    .select("paid_coin_balance, bonus_coin_balance")
    .eq("user_id", input.userId)
    .maybeSingle();
  const paid = asNumber(wallet?.paid_coin_balance as number | undefined);
  const bonus = asNumber(wallet?.bonus_coin_balance as number | undefined);
  const total = paid + bonus;
  const debitAmount = Math.min(total, input.amount);
  if (debitAmount > 0) {
    const ledger = await applyUserCoinLedgerRecord({
      userId: input.userId,
      transactionCode: buildTransactionCode("REFUND-DEBIT"),
      type: "refund",
      source: "refund",
      direction: "debit",
      amount: debitAmount,
      metadata: {
        original_transaction_id: input.originalTransactionId,
        wallet_debit: true
      }
    });
    if (!ledger.data) {
      throw new Error(ledger.error ?? "Không thể trừ coin khi refund.");
    }
  }
  if (total < input.amount) {
    await createRiskEventRecord({
      userId: input.userId,
      eventType: "refund_after_coin_spent",
      severity: "high",
      riskScore: 78,
      reason: "Refund khi coin đã được tiêu trước đó.",
      metadata: {
        original_transaction_id: input.originalTransactionId,
        requested_coin_refund: input.amount,
        debited_coin: debitAmount
      }
    });
    const profile = await getOrCreateUserRiskProfile(input.userId);
    if (profile.data) {
      await updateUserRiskProfileRecord(input.userId, {
        monetization_blocked: true,
        metadata: { ...(profile.data.metadata ?? {}), refund_abuse_review: true }
      });
    }
  }
}

export async function processRefundAction(refundId: string) {
  const auth = await assertRefundStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const refund = await getRefundById(refundId);
  if (!refund.data) return { ok: false, error: refund.error };
  if (refund.data.status === "completed") {
    return { ok: false, error: "Refund này đã được xử lý." };
  }
  const original = await getTransactionById(refund.data.originalTransactionId);
  if (!original.data) return { ok: false, error: original.error };
  const existingProcessed = await findProcessedRefundByOriginalTransaction(original.data.id);
  if (existingProcessed && existingProcessed.id !== refund.data.id) {
    return { ok: false, error: "Transaction gốc đã có refund processed." };
  }

  const isCoinPurchaseRefund =
    Boolean(refund.data.userId) &&
    asNumber(refund.data.coinAmount) > 0 &&
    original.data.type === "coin_purchase";

  if (isCoinPurchaseRefund) {
    await debitUserCoinForRefund({
      userId: refund.data.userId!,
      amount: asNumber(refund.data.coinAmount),
      originalTransactionId: original.data.id
    });
  } else {
    await createRefundTransaction({
      originalTransactionId: original.data.id,
      userId: refund.data.userId,
      amountVnd: refund.data.amountVnd,
      coinAmount: refund.data.coinAmount,
      metadata: { refund_record_id: refund.data.id }
    });
  }

  if (original.data.type === "vip_subscription") {
    await cancelVipIfMatched(original.data.id);
  }
  if (original.data.type === "fan_club_subscription") {
    await cancelFanClubIfMatched(original.data.id);
  }

  await lockCreatorRevenueIfTraceable(original.data.id);
  await updateRefundStatus({
    refundId,
    status: "completed",
    processedBy: auth.userId,
    completedBy: auth.userId
  });

  await logFinanceAdminAction({
    action: "refund_processed",
    targetType: "refund",
    targetId: refundId,
    metadata: {
      original_transaction_id: original.data.id,
      user_id: refund.data.userId,
      amount_vnd: refund.data.amountVnd,
      coin_amount: refund.data.coinAmount
    }
  });

  return { ok: true, error: null };
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

export async function createManualRefundFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return createManualRefundAction({
    originalTransactionId: String(formData.get("originalTransactionId") ?? ""),
    reason: String(formData.get("reason") ?? "") || null,
    provider: String(formData.get("provider") ?? "") || null,
    providerReference: String(formData.get("providerReference") ?? "") || null
  });
}

export async function updateRefundStatusFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  const auth = await assertRefundStaff();
  if (!auth.ok) return { ok: false, error: auth.error };
  const refundId = String(formData.get("refundId") ?? "");
  const status = String(formData.get("status") ?? "pending") as
    | "pending"
    | "reviewing"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed"
    | "cancelled"
    | "requested"
    | "processed";
  const normalizedStatus =
    status === "requested"
      ? "pending"
      : status === "processed"
        ? "completed"
        : status;
  if (normalizedStatus === "completed") {
    return processRefundAction(refundId);
  }
  const updated = await updateRefundStatus({
    refundId,
    status: normalizedStatus as "pending" | "reviewing" | "approved" | "processing" | "completed" | "rejected" | "failed" | "cancelled",
    processedBy: auth.userId
  });
  if (!updated.data) return { ok: false, error: updated.error };
  return { ok: true, error: null };
}
