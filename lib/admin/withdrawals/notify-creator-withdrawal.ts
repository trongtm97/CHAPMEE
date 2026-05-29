"use server";

import { createNotification } from "@/lib/notifications/create-notification";
import { formatWithdrawalCode } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { WithdrawalAdminAction } from "@/types/admin-withdrawal";

export async function notifyCreatorWithdrawalStatusChange(input: {
  creatorUserId: string;
  requestId: string;
  action: WithdrawalAdminAction;
  amountVnd: number;
  rejectReason?: string | null;
}) {
  const code = formatWithdrawalCode(input.requestId);
  const amountLabel = `${input.amountVnd.toLocaleString("vi-VN")} ₫`;
  const actionUrl = "/studio/finance";

  switch (input.action) {
    case "approve":
      await createNotification(input.creatorUserId, "creator_withdrawal_approved", {
        title: "Yêu cầu rút tiền đã được duyệt",
        body: `Yêu cầu ${code} (${amountLabel}) đã được duyệt và sẽ được xử lý.`,
        targetType: "payout_request",
        targetId: input.requestId,
        actionUrl,
        metadata: { withdrawal_code: code, amount_vnd: input.amountVnd }
      });
      break;
    case "processing":
      await createNotification(input.creatorUserId, "creator_withdrawal_processing", {
        title: "Yêu cầu rút tiền đang được xử lý",
        body: `Yêu cầu ${code} (${amountLabel}) đang được chuyển khoản thủ công.`,
        targetType: "payout_request",
        targetId: input.requestId,
        actionUrl,
        metadata: { withdrawal_code: code }
      });
      break;
    case "paid":
      await createNotification(input.creatorUserId, "creator_withdrawal_paid", {
        title: "Yêu cầu rút tiền đã thanh toán",
        body: `Yêu cầu ${code} (${amountLabel}) đã được ghi nhận thanh toán.`,
        targetType: "payout_request",
        targetId: input.requestId,
        actionUrl,
        metadata: { withdrawal_code: code, amount_vnd: input.amountVnd }
      });
      break;
    case "reject":
      await createNotification(input.creatorUserId, "creator_withdrawal_rejected", {
        title: "Yêu cầu rút tiền bị từ chối",
        body: `Yêu cầu ${code}: ${input.rejectReason?.trim() || "Không có lý do cụ thể."}`,
        targetType: "payout_request",
        targetId: input.requestId,
        actionUrl,
        metadata: { withdrawal_code: code, reject_reason: input.rejectReason ?? null }
      });
      break;
    case "failed":
      await createNotification(input.creatorUserId, "creator_withdrawal_failed", {
        title: "Yêu cầu rút tiền thất bại",
        body: `Yêu cầu ${code}: ${input.rejectReason?.trim() || "Thanh toán không thành công."}`,
        targetType: "payout_request",
        targetId: input.requestId,
        actionUrl,
        metadata: { withdrawal_code: code, failure_reason: input.rejectReason ?? null }
      });
      break;
    default:
      break;
  }
}
