"use server";

import { adminUpdatePayoutStatusAction } from "@/lib/monetization/payouts";
import {
  getPayoutRequestById,
  shiftCreatorWalletBalances,
  updatePayoutRequestStatus
} from "@/lib/supabase/payouts";
import { insertCreatorWalletLedgerEntry } from "@/lib/supabase/creator-finance";
import { getCreatorMonetizationProfile } from "@/lib/supabase/creator-monetization";
import { createClient } from "@/lib/supabase/server";
import type { PayoutRequestStatus } from "@/types/payout";

async function appendLedgerForRequest(input: {
  creatorUserId: string;
  requestId: string;
  transactionId: string | null;
  type: "withdrawal_refund" | "withdrawal_paid";
  amountVnd: number;
  description: string;
}) {
  return insertCreatorWalletLedgerEntry({
    creatorUserId: input.creatorUserId,
    type: input.type,
    amountVnd: input.amountVnd,
    direction: input.type === "withdrawal_refund" ? "credit" : "debit",
    withdrawalRequestId: input.requestId,
    transactionId: input.transactionId,
    sourceType: "payout_request",
    sourceId: input.requestId,
    description: input.description
  });
}

export async function validateWithdrawalCanApprove(creatorUserId: string) {
  const supabase = await createClient();
  const [{ data: profile }, monetization] = await Promise.all([
    supabase.from("profiles").select("status").eq("id", creatorUserId).maybeSingle(),
    getCreatorMonetizationProfile(creatorUserId)
  ]);

  if (profile?.status === "banned" || profile?.status === "suspended") {
    return { ok: false, error: "Tài khoản bị hạn chế, không thể duyệt rút tiền." };
  }
  if (!monetization.data || monetization.data.status === "suspended") {
    return { ok: false, error: "Monetization bị tạm dừng, không thể duyệt." };
  }
  if (!monetization.data.monetization_enabled || !monetization.data.payout_enabled) {
    return { ok: false, error: "Tác giả chưa được bật rút tiền." };
  }
  return { ok: true, error: null };
}

export async function approveWithdrawalRequest(requestId: string, adminNote?: string) {
  const request = await getPayoutRequestById(requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy yêu cầu." };
  }
  const gate = await validateWithdrawalCanApprove(request.data.creator_user_id);
  if (!gate.ok) return gate;

  return adminUpdatePayoutStatusAction({
    requestId,
    status: "approved",
    adminNote
  });
}

export async function markWithdrawalRiskReview(requestId: string, adminNote?: string) {
  const auth = await import("@/lib/auth/staff-guards").then((m) =>
    m.checkStaffPermission("finance.payout.approve")
  );
  if (!auth.ok) return { ok: false, error: auth.error };

  const updated = await updatePayoutRequestStatus({
    requestId,
    status: "under_review",
    reviewedBy: auth.userId,
    adminNote: adminNote ?? null,
    riskLevel: "warning"
  });
  if (!updated.data) {
    return { ok: false, error: updated.error ?? "Không thể cập nhật." };
  }
  return { ok: true, error: null };
}

async function relockWithdrawalFunds(requestId: string) {
  const request = await getPayoutRequestById(requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy yêu cầu." };
  }

  const shifted = await shiftCreatorWalletBalances({
    creatorUserId: request.data.creator_user_id,
    from: "available",
    to: "locked",
    amountVnd: request.data.amount_vnd
  });
  if (!shifted.data) {
    return { ok: false, error: shifted.error ?? "Không đủ số dư để khóa lại." };
  }
  return { ok: true, error: null };
}

export async function returnWithdrawalToApproved(requestId: string, adminNote?: string) {
  const request = await getPayoutRequestById(requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy yêu cầu." };
  }

  if (request.data.status === "failed" || request.data.status === "rejected") {
    const lock = await relockWithdrawalFunds(requestId);
    if (!lock.ok) return lock;
  }

  return adminUpdatePayoutStatusAction({
    requestId,
    status: "approved",
    adminNote
  });
}

export async function reopenWithdrawalRequest(requestId: string, adminNote?: string) {
  const request = await getPayoutRequestById(requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy yêu cầu." };
  }
  if (!["rejected", "cancelled", "failed"].includes(request.data.status)) {
    return { ok: false, error: "Chỉ có thể mở lại yêu cầu đã từ chối/thất bại." };
  }

  const gate = await validateWithdrawalCanApprove(request.data.creator_user_id);
  if (!gate.ok) return gate;

  const lock = await relockWithdrawalFunds(requestId);
  if (!lock.ok) return lock;

  return adminUpdatePayoutStatusAction({
    requestId,
    status: "approved",
    adminNote,
    rejectReason: null
  });
}

export async function rejectWithdrawalRequest(
  requestId: string,
  rejectReason: string,
  adminNote?: string
) {
  const request = await getPayoutRequestById(requestId);
  const result = await adminUpdatePayoutStatusAction({
    requestId,
    status: "rejected",
    rejectReason,
    adminNote
  });

  if (result.ok && request.data) {
    await appendLedgerForRequest({
      creatorUserId: request.data.creator_user_id,
      requestId: request.data.id,
      transactionId: request.data.transaction_id,
      type: "withdrawal_refund",
      amountVnd: request.data.amount_vnd,
      description: "Hoàn giữ số dư — yêu cầu bị từ chối"
    });
  }

  return result;
}

export async function markWithdrawalProcessing(requestId: string, adminNote?: string) {
  return adminUpdatePayoutStatusAction({
    requestId,
    status: "processing",
    adminNote
  });
}

export async function markWithdrawalPaid(
  requestId: string,
  input?: { adminNote?: string; paymentReference?: string; paidAt?: string }
) {
  const request = await getPayoutRequestById(requestId);
  if (request.data?.status === "completed") {
    return { ok: false, error: "Yêu cầu đã được thanh toán trước đó." };
  }

  const result = await adminUpdatePayoutStatusAction({
    requestId,
    status: "completed",
    adminNote: input?.adminNote,
    paymentReference: input?.paymentReference,
    paidAt: input?.paidAt
  });

  if (result.ok && request.data) {
    await appendLedgerForRequest({
      creatorUserId: request.data.creator_user_id,
      requestId: request.data.id,
      transactionId: request.data.transaction_id,
      type: "withdrawal_paid",
      amountVnd: request.data.amount_vnd,
      description: "Đã thanh toán (không chuyển tiền tự động — admin xác nhận)"
    });
  }

  return result;
}

export async function markWithdrawalFailed(
  requestId: string,
  failureReason: string,
  adminNote?: string
) {
  const request = await getPayoutRequestById(requestId);
  const result = await adminUpdatePayoutStatusAction({
    requestId,
    status: "failed",
    rejectReason: failureReason,
    adminNote
  });

  if (result.ok && request.data) {
    await refundWithdrawalHold(requestId);
  }

  return result;
}

export async function refundWithdrawalHold(requestId: string) {
  const request = await getPayoutRequestById(requestId);
  if (!request.data) {
    return { ok: false, error: request.error ?? "Không tìm thấy yêu cầu." };
  }

  return appendLedgerForRequest({
    creatorUserId: request.data.creator_user_id,
    requestId: request.data.id,
    transactionId: request.data.transaction_id,
    type: "withdrawal_refund",
    amountVnd: request.data.amount_vnd,
    description: "Hoàn giữ số dư"
  });
}

export async function adminSetWithdrawalStatus(input: {
  requestId: string;
  status: PayoutRequestStatus;
  adminNote?: string;
  rejectReason?: string;
}) {
  switch (input.status) {
    case "approved":
      return approveWithdrawalRequest(input.requestId, input.adminNote);
    case "rejected":
      return rejectWithdrawalRequest(
        input.requestId,
        input.rejectReason ?? "Từ chối bởi admin",
        input.adminNote
      );
    case "processing":
      return markWithdrawalProcessing(input.requestId, input.adminNote);
    case "completed":
      return markWithdrawalPaid(input.requestId, { adminNote: input.adminNote });
    case "failed":
      return markWithdrawalFailed(
        input.requestId,
        input.rejectReason ?? "Thất bại",
        input.adminNote
      );
    default:
      return adminUpdatePayoutStatusAction({
        requestId: input.requestId,
        status: input.status,
        adminNote: input.adminNote,
        rejectReason: input.rejectReason
      });
  }
}
