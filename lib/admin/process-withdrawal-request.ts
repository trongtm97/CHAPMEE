"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { notifyCreatorWithdrawalStatusChange } from "@/lib/admin/withdrawals/notify-creator-withdrawal";
import {
  approveWithdrawalRequest,
  markWithdrawalFailed,
  markWithdrawalPaid,
  markWithdrawalProcessing,
  markWithdrawalRiskReview,
  reopenWithdrawalRequest,
  rejectWithdrawalRequest,
  returnWithdrawalToApproved
} from "@/lib/finance/admin-withdrawal";
import { getPayoutRequestById } from "@/lib/supabase/payouts";
import { checkStaffPermission } from "@/lib/auth/staff-guards";
import type { ProcessWithdrawalActionInput, WithdrawalAdminAction } from "@/types/admin-withdrawal";
import type { PayoutRequestStatus } from "@/types/payout";

export type ProcessWithdrawalInput = ProcessWithdrawalActionInput;

export async function processWithdrawalRequest(input: ProcessWithdrawalInput) {
  const permission = permissionForAction(input.action);
  const auth = await checkStaffPermission(permission);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const existing = await getPayoutRequestById(input.requestId);
  if (!existing.data) {
    return { ok: false, error: existing.error ?? "Không tìm thấy yêu cầu." };
  }

  const before = {
    status: existing.data.status,
    amount_vnd: existing.data.amount_vnd,
    payment_reference: existing.data.payment_reference
  };

  const validationError = validateActionInput(input, existing.data.status);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  let result: { ok: boolean; error: string | null };

  switch (input.action) {
    case "approve":
      result = await approveWithdrawalRequest(input.requestId, input.adminNote);
      break;
    case "reject":
      result = await rejectWithdrawalRequest(
        input.requestId,
        input.rejectReason!,
        input.adminNote
      );
      break;
    case "processing":
      result = await markWithdrawalProcessing(input.requestId, input.adminNote);
      break;
    case "paid":
      result = await markWithdrawalPaid(input.requestId, {
        adminNote: input.adminNote,
        paymentReference: input.paymentReference,
        paidAt: input.paidAt
      });
      break;
    case "failed":
      result = await markWithdrawalFailed(
        input.requestId,
        input.rejectReason ?? "Thất bại",
        input.adminNote
      );
      break;
    case "risk_review":
      result = await markWithdrawalRiskReview(input.requestId, input.adminNote);
      break;
    case "return_to_approved":
      result = await returnWithdrawalToApproved(input.requestId, input.adminNote);
      break;
    case "reopen":
      result = await reopenWithdrawalRequest(input.requestId, input.adminNote);
      break;
    default:
      return { ok: false, error: "Hành động không hợp lệ." };
  }

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Không thể cập nhật." };
  }

  const newStatus = statusForAction(input.action);
  const auditAction = auditActionFor(input.action);

  await createAdminAuditLog({
    actorId: auth.userId,
    action: auditAction,
    targetType: "payout_request",
    targetId: input.requestId,
    note: input.adminNote ?? input.rejectReason ?? null,
    before,
    after: {
      status: newStatus,
      payment_reference: input.paymentReference ?? null,
      paid_at: input.paidAt ?? null
    },
    metadata: {
      creator_user_id: existing.data.creator_user_id,
      amount_vnd: existing.data.amount_vnd,
      reference_code: input.paymentReference ?? null
    }
  });

  await notifyCreatorWithdrawalStatusChange({
    creatorUserId: existing.data.creator_user_id,
    requestId: input.requestId,
    action: input.action,
    amountVnd: existing.data.amount_vnd,
    rejectReason: input.rejectReason
  });

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/finance");
  revalidatePath("/studio/finance");

  return { ok: true };
}

function permissionForAction(action: WithdrawalAdminAction) {
  return action === "reject" || action === "failed"
    ? "finance.payout.reject"
    : "finance.payout.approve";
}

function validateActionInput(input: ProcessWithdrawalInput, currentStatus: PayoutRequestStatus) {
  if (input.action === "reject" || input.action === "failed") {
    if (!String(input.rejectReason ?? "").trim()) {
      return input.action === "reject"
        ? "Vui lòng nhập lý do từ chối."
        : "Vui lòng nhập lý do thất bại.";
    }
  }

  if (input.action === "paid") {
    if (!String(input.paymentReference ?? "").trim()) {
      return "Vui lòng nhập mã tham chiếu thanh toán.";
    }
    if (currentStatus === "completed") {
      return "Yêu cầu đã được thanh toán.";
    }
  }

  if (currentStatus === "completed" && input.action !== "reopen") {
    return "Yêu cầu đã thanh toán, không thể chỉnh sửa.";
  }

  return null;
}

function auditActionFor(action: WithdrawalAdminAction): string {
  switch (action) {
    case "reject":
      return "reject_payout";
    case "paid":
      return "payout_paid";
    case "processing":
      return "payout_processing";
    case "failed":
      return "payout_failed";
    case "risk_review":
      return "payout_risk_review";
    case "reopen":
      return "payout_reopen";
    case "return_to_approved":
      return "payout_return_approved";
    default:
      return "approve_payout";
  }
}

function statusForAction(action: WithdrawalAdminAction): PayoutRequestStatus {
  switch (action) {
    case "approve":
    case "reopen":
    case "return_to_approved":
      return "approved";
    case "reject":
      return "rejected";
    case "processing":
      return "processing";
    case "paid":
      return "completed";
    case "failed":
      return "failed";
    case "risk_review":
      return "under_review";
    default:
      return "under_review";
  }
}
