"use server";

import { randomUUID } from "crypto";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import {
  assertNotSelfFinanceAction,
  assertPositiveAmount,
  logFinanceAdminAction,
  requireWalletAdjustAccess
} from "@/lib/auth/finance-guards";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { getCurrentProfile } from "@/lib/auth/getCurrentProfile";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { sumLockedFullStoryRevenueForCreator } from "@/lib/monetization/story-completion-escrow";
import { addRiskEvent, shouldBlockPayout } from "@/lib/risk/risk-engine";
import { createTransaction, getTransactionsForAdmin, updateTransactionStatus } from "@/lib/data/transactions";
import {
  createCreatorPayoutAccount,
  createPayoutRequestRecord,
  createRevenueReleaseLog,
  getCreatorPayoutAccountById,
  getPayoutRequestById,
  hasRevenueReleaseLog,
  maybeAutoApproveOwnPayoutRequest,
  shiftCreatorWalletBalances,
  updatePayoutRequestStatus
} from "@/lib/data/payouts";
import { getCreatorAccessStatus } from "@/lib/creator-access";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import type { PayoutMethod, PayoutRequestStatus } from "@/types/payout";

function getAllowedMethods(settings: Record<string, unknown>): PayoutMethod[] {
  const raw = String(settings["payout.allowed_methods"] ?? "manual");
  const allowed = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is PayoutMethod =>
      ["bank_transfer", "momo", "zalopay", "manual"].includes(item)
    );
  return allowed.length > 0 ? allowed : ["manual"];
}

function sanitizeAmount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function resolveFormData(
  first: FormData | { ok: boolean; error: string | null },
  second?: FormData
) {
  return first instanceof FormData ? first : (second as FormData);
}

async function getPayoutRuntimeConfig() {
  const config = await getMonetizationConfig({ includePrivate: true });
  const settings = config.settings as Record<string, unknown>;
  return {
    enabled:
      Boolean(settings["monetization.enabled"]) &&
      Boolean(settings["creator_monetization.enabled"]) &&
      Boolean(settings["payout.enabled"]),
    minWithdrawAmount: Math.max(0, sanitizeAmount(settings["payout.min_withdraw_amount_vnd"])),
    holdDays: Math.max(0, Number(settings["payout.hold_days"] ?? 14)),
    manualReviewRequired: Boolean(settings["payout.manual_review_required"]),
    kycRequired: Boolean(settings["payout.kyc_required"]),
    allowedMethods: getAllowedMethods(settings),
    processingNote: String(settings["payout.processing_note"] ?? "")
  };
}

export async function createCreatorPayoutAccountAction(input: {
  method: PayoutMethod;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumberMasked?: string;
  walletPhoneMasked?: string;
  setDefault?: boolean;
}) {
  const { profile, user } = await getCurrentProfile();
  if (!user || !profile) return { ok: false, error: "Bạn cần đăng nhập.", data: null };

  try {
    await assertActionAccess("creator.payout.request");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, data: null };
    }
    throw error;
  }

  const config = await getPayoutRuntimeConfig();
  if (!config.enabled) return { ok: false, error: "Payout đang tắt.", data: null };

  const created = await createCreatorPayoutAccount({
    creatorUserId: user.id,
    method: input.method,
    accountHolderName: input.accountHolderName?.trim() || null,
    bankName: input.bankName?.trim() || null,
    bankAccountNumberMasked: input.bankAccountNumberMasked?.trim() || null,
    walletPhoneMasked: input.walletPhoneMasked?.trim() || null,
    isDefault: Boolean(input.setDefault)
  });
  if (!created.data) {
    return { ok: false, error: created.error ?? "Không thể tạo payout account.", data: null };
  }
  return { ok: true, error: null, data: created.data };
}

export async function createCreatorPayoutAccountFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return createCreatorPayoutAccountAction({
    method: String(formData.get("method") ?? "manual") as PayoutMethod,
    accountHolderName: String(formData.get("account_holder_name") ?? ""),
    bankName: String(formData.get("bank_name") ?? ""),
    bankAccountNumberMasked: String(formData.get("bank_account_number_masked") ?? ""),
    walletPhoneMasked: String(formData.get("wallet_phone_masked") ?? ""),
    setDefault: Boolean(formData.get("is_default"))
  });
}

export async function requestPayoutAction(input: {
  amountVnd: number;
  method: PayoutMethod;
  payoutAccountId: string;
}) {
  const { user } = await getCurrentProfile();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập.", data: null };

  try {
    await assertActionAccess("creator.payout.request");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { ok: false, error: error.message, data: null };
    }
    throw error;
  }

  const config = await getPayoutRuntimeConfig();
  if (!config.enabled) return { ok: false, error: "Payout đang tắt bởi admin.", data: null };
  if (!config.allowedMethods.includes(input.method)) {
    return { ok: false, error: "Phương thức payout không hợp lệ.", data: null };
  }

  const access = await getCreatorAccessStatus(user.id, {
    minWithdrawAmountVnd: config.minWithdrawAmount,
    availableBalanceVnd: 0
  });
  if (!access.withdrawalEnabled) {
    return {
      ok: false,
      error:
        access.withdrawalDisabledReason ??
        "Tài khoản của bạn đang bị tạm tắt quyền rút tiền bởi ChapMee.",
      data: null
    };
  }

  const payoutBlocked = await shouldBlockPayout(user.id);
  if (payoutBlocked) {
    await addRiskEvent({
      creatorUserId: user.id,
      eventType: "payout_blocked_by_risk",
      severity: "high",
      reason: "Payout bị chặn do risk profile hoặc open high risk events."
    });
    await trackServerEvent({
      eventName: "payout_blocked_by_risk",
      category: "monetization",
      targetType: "creator",
      targetId: user.id,
      metadata: { reason: "risk_profile_or_open_events" }
    });
    return {
      ok: false,
      error: "Yêu cầu rút tiền của bạn đang được xem xét bảo mật.",
      data: null
    };
  }

  const wallet = await getOrCreateCreatorWallet(user.id);
  if (!wallet.data) {
    return { ok: false, error: wallet.error ?? "Không thể tải ví creator.", data: null };
  }

  const amount = sanitizeAmount(input.amountVnd);
  if (amount < config.minWithdrawAmount) {
    return {
      ok: false,
      error: `Số tiền rút tối thiểu là ${config.minWithdrawAmount.toLocaleString("vi-VN")} VND.`,
      data: null
    };
  }
  if (amount > wallet.data.available_revenue_vnd) {
    const lockedFullStory = await sumLockedFullStoryRevenueForCreator(user.id);
    if (lockedFullStory > 0) {
      return {
        ok: false,
        error:
          "Một phần doanh thu của bạn đang được giữ do truyện bán trọn bộ chưa được admin xác nhận hoàn thành.",
        data: null
      };
    }
    return { ok: false, error: "Số dư available không đủ.", data: null };
  }

  const payoutAccount = await getCreatorPayoutAccountById(input.payoutAccountId, user.id);
  if (!payoutAccount.data) {
    return { ok: false, error: payoutAccount.error ?? "Payout account không hợp lệ.", data: null };
  }

  const lockWallet = await shiftCreatorWalletBalances({
    creatorUserId: user.id,
    from: "available",
    to: "locked",
    amountVnd: amount
  });
  if (!lockWallet.data) {
    return { ok: false, error: lockWallet.error ?? "Không thể khóa số tiền rút.", data: null };
  }

  const tx = await createTransaction({
    transactionCode: `PAYOUT-REQ-${user.id}-${randomUUID()}`,
    type: "payout_request",
    direction: "debit",
    source: "payout",
    status: "pending",
    creatorUserId: user.id,
    moneyAmountVnd: amount,
    metadata: {
      method: input.method,
      payout_account_id: payoutAccount.data.id,
      manual_review_required: config.manualReviewRequired
    }
  });
  if (!tx.data) {
    await shiftCreatorWalletBalances({
      creatorUserId: user.id,
      from: "locked",
      to: "available",
      amountVnd: amount
    });
    return { ok: false, error: tx.error ?? "Không thể tạo transaction payout.", data: null };
  }

  const request = await createPayoutRequestRecord({
    creatorUserId: user.id,
    amountVnd: amount,
    method: input.method,
    status: config.manualReviewRequired ? "under_review" : "requested",
    payoutAccountSnapshot: {
      method: payoutAccount.data.method,
      account_holder_name: payoutAccount.data.account_holder_name,
      bank_name: payoutAccount.data.bank_name,
      bank_account_number_masked: payoutAccount.data.bank_account_number_masked,
      wallet_phone_masked: payoutAccount.data.wallet_phone_masked
    },
    transactionId: tx.data.id
  });
  if (!request.data) {
    await shiftCreatorWalletBalances({
      creatorUserId: user.id,
      from: "locked",
      to: "available",
      amountVnd: amount
    });
    await updateTransactionStatus(tx.data.id, "cancelled");
    return { ok: false, error: request.error ?? "Không thể tạo payout request.", data: null };
  }

  let finalRequest = request.data;
  if (!config.manualReviewRequired) {
    const autoApproved = await maybeAutoApproveOwnPayoutRequest(request.data.id);
    if (autoApproved.data) {
      finalRequest = autoApproved.data;
    }
  }

  await trackServerEvent({
    eventName: "payout_requested",
    category: "monetization",
    targetType: "creator",
    targetId: user.id,
    metadata: {
      payout_request_id: finalRequest.id,
      amount_vnd: amount,
      method: input.method,
      status: finalRequest.status
    }
  });

  return { ok: true, error: null, data: finalRequest };
}

export async function requestPayoutFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return requestPayoutAction({
    amountVnd: Number(formData.get("amount_vnd") ?? 0),
    method: String(formData.get("method") ?? "manual") as PayoutMethod,
    payoutAccountId: String(formData.get("payout_account_id") ?? "")
  });
}

export async function adminUpdatePayoutStatusAction(input: {
  requestId: string;
  status: PayoutRequestStatus;
  adminNote?: string;
  rejectReason?: string | null;
  paymentReference?: string;
  paidAt?: string;
}) {
  const permission =
    input.status === "rejected" ||
    input.status === "failed" ||
    input.status === "cancelled"
      ? "finance.payout.reject"
      : "finance.payout.approve";
  const auth = await checkStaffPermission(permission);
  if (!auth.ok) {
    return { ok: false, error: auth.error, data: null };
  }
  const user = { id: auth.userId };

  const request = await getPayoutRequestById(input.requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy payout request.", data: null };
  }

  const selfCheck = await assertNotSelfFinanceAction(
    request.data.creator_user_id,
    "duyệt payout"
  );
  if (!selfCheck.ok) {
    return { ok: false, error: selfCheck.error, data: null };
  }

  if (
    (input.status === "rejected" ||
      input.status === "failed" ||
      input.status === "cancelled") &&
    !String(input.rejectReason ?? "").trim()
  ) {
    return { ok: false, error: "Vui lòng nhập lý do từ chối payout.", data: null };
  }

  const amountCheck = assertPositiveAmount(request.data.amount_vnd, "Số tiền payout");
  if (!amountCheck.ok) {
    return { ok: false, error: amountCheck.error, data: null };
  }

  const oldStatus = request.data.status;

  if (request.data.status === "completed") {
    return { ok: false, error: "Yêu cầu đã thanh toán, không thể thay đổi.", data: null };
  }

  if (
    input.status !== "approved" &&
    ["rejected", "cancelled"].includes(request.data.status)
  ) {
    return { ok: false, error: "Payout request đã kết thúc.", data: null };
  }

  if (input.status === "completed" && !String(input.paymentReference ?? "").trim()) {
    return {
      ok: false,
      error: "Vui lòng nhập mã tham chiếu thanh toán.",
      data: null
    };
  }

  if (input.status === "rejected" || input.status === "failed" || input.status === "cancelled") {
    const rollback = await shiftCreatorWalletBalances({
      creatorUserId: request.data.creator_user_id,
      from: "locked",
      to: "available",
      amountVnd: request.data.amount_vnd
    });
    if (!rollback.data) {
      return { ok: false, error: rollback.error ?? "Không thể hoàn tiền locked về available.", data: null };
    }
    if (request.data.transaction_id) {
      await updateTransactionStatus(request.data.transaction_id, input.status === "failed" ? "failed" : "cancelled");
    }
    await trackServerEvent({
      eventName: "payout_rejected",
      category: "monetization",
      targetType: "creator",
      targetId: request.data.creator_user_id,
      metadata: {
        payout_request_id: request.data.id,
        status: input.status,
        reject_reason: input.rejectReason ?? null
      }
    });
  }

  if (input.status === "completed") {
    const done = await shiftCreatorWalletBalances({
      creatorUserId: request.data.creator_user_id,
      from: "locked",
      to: "none",
      amountVnd: request.data.amount_vnd,
      increaseWithdrawn: true
    });
    if (!done.data) {
      return { ok: false, error: done.error ?? "Không thể hoàn tất payout.", data: null };
    }
    if (request.data.transaction_id) {
      await updateTransactionStatus(request.data.transaction_id, "completed");
    }
    await trackServerEvent({
      eventName: "payout_completed",
      category: "monetization",
      targetType: "creator",
      targetId: request.data.creator_user_id,
      metadata: { payout_request_id: request.data.id, amount_vnd: request.data.amount_vnd }
    });
  }

  if (input.status === "approved") {
    await trackServerEvent({
      eventName: "payout_approved",
      category: "monetization",
      targetType: "creator",
      targetId: request.data.creator_user_id,
      metadata: { payout_request_id: request.data.id, amount_vnd: request.data.amount_vnd }
    });
  }

  await trackServerEvent({
    eventName: "fraud_review_action_taken",
    category: "monetization",
    targetType: "creator",
    targetId: request.data.creator_user_id,
    metadata: {
      payout_request_id: request.data.id,
      action: input.status
    }
  });

  const updated = await updatePayoutRequestStatus({
    requestId: request.data.id,
    status: input.status,
    reviewedBy: user.id,
    adminNote: input.adminNote ?? null,
    rejectReason: input.rejectReason ?? null,
    paymentReference:
      input.status === "completed" ? String(input.paymentReference ?? "").trim() : undefined,
    paidAt: input.status === "completed" ? input.paidAt ?? new Date().toISOString() : undefined
  });
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật payout status.", data: null };
  }

  await logFinanceAdminAction({
    action:
      input.status === "rejected" || input.status === "cancelled" || input.status === "failed"
        ? "reject_payout"
        : input.status === "completed"
          ? "payout_paid"
          : "approve_payout",
    targetType: "payout_request",
    targetId: request.data.id,
    metadata: {
      amount_vnd: request.data.amount_vnd,
      user_id: request.data.creator_user_id,
      payout_id: request.data.id,
      transaction_id: request.data.transaction_id,
      old_status: oldStatus,
      new_status: input.status,
      reason: input.rejectReason ?? null,
      admin_note: input.adminNote ?? null,
      payment_reference: input.paymentReference ?? null
    }
  });

  return { ok: true, error: null, data: updated.data };
}

export async function adminUpdatePayoutStatusFormAction(
  stateOrFormData: FormData | { ok: boolean; error: string | null },
  maybeFormData?: FormData
) {
  const formData = resolveFormData(stateOrFormData, maybeFormData);
  return adminUpdatePayoutStatusAction({
    requestId: String(formData.get("request_id") ?? ""),
    status: String(formData.get("status") ?? "under_review") as PayoutRequestStatus,
    adminNote: String(formData.get("admin_note") ?? ""),
    rejectReason: String(formData.get("reject_reason") ?? "")
  });
}

export async function releaseEligiblePendingRevenue(creatorUserId: string) {
  const config = await getPayoutRuntimeConfig();
  const holdMs = config.holdDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const txs = await getTransactionsForAdmin({
    type: "creator_revenue_share",
    status: "completed",
    limit: 500
  });
  if (txs.error) {
    return { ok: false, error: txs.error, releasedAmountVnd: 0 };
  }

  let releasedAmount = 0;
  for (const tx of txs.data) {
    if (tx.creator_user_id !== creatorUserId) continue;
    if (!tx.created_at) continue;
    const age = now - new Date(tx.created_at).getTime();
    if (age < holdMs) continue;

    const already = await hasRevenueReleaseLog(tx.id);
    if (already.data) continue;
    const withdrawable = Number(tx.metadata?.withdrawable_amount ?? tx.money_amount_vnd ?? 0);
    if (!(withdrawable > 0)) continue;

    const moved = await shiftCreatorWalletBalances({
      creatorUserId,
      from: "pending",
      to: "available",
      amountVnd: withdrawable
    });
    if (!moved.data) {
      continue;
    }
    await createRevenueReleaseLog({
      creatorUserId,
      sourceTransactionId: tx.id,
      releasedAmountVnd: withdrawable,
      metadata: { transaction_code: tx.transaction_code }
    });
    releasedAmount += withdrawable;
  }

  return { ok: true, error: null, releasedAmountVnd: Number(releasedAmount.toFixed(2)) };
}

export async function adminReleasePendingRevenueAction(input: {
  creatorUserId: string;
}) {
  const auth = await requireWalletAdjustAccess();
  if (!auth.ok) {
    return { ok: false, error: auth.error, data: null };
  }

  const released = await releaseEligiblePendingRevenue(input.creatorUserId);
  if (!released.ok) {
    return { ok: false, error: released.error ?? "Không thể release pending revenue.", data: null };
  }

  await logFinanceAdminAction({
    action: "wallet_pending_revenue_released",
    targetType: "creator",
    targetId: input.creatorUserId,
    metadata: {
      user_id: input.creatorUserId,
      amount_vnd: released.releasedAmountVnd
    }
  });

  return { ok: true, error: null, data: released };
}
