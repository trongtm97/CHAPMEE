import type { PayoutRequestStatus } from "@/types/payout";
import type { WithdrawalStatusUi } from "@/types/finance";

const STATUS_LABELS: Record<WithdrawalStatusUi, string> = {
  pending: "Đang chờ duyệt",
  approved: "Đã duyệt",
  processing: "Đang xử lý",
  paid: "Đã thanh toán",
  rejected: "Bị từ chối",
  failed: "Thất bại",
  canceled: "Đã hủy"
};

export function mapPayoutStatusToUi(status: PayoutRequestStatus): WithdrawalStatusUi {
  switch (status) {
    case "requested":
    case "under_review":
      return "pending";
    case "approved":
      return "approved";
    case "processing":
      return "processing";
    case "completed":
      return "paid";
    case "rejected":
      return "rejected";
    case "failed":
      return "failed";
    case "cancelled":
      return "canceled";
    default:
      return "pending";
  }
}

export function withdrawalStatusLabel(ui: WithdrawalStatusUi): string {
  return STATUS_LABELS[ui];
}
