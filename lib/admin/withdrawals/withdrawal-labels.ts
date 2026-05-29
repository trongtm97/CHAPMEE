import type { PayoutMethod, PayoutRequestStatus } from "@/types/payout";
import type { WithdrawalStatusFilter } from "@/types/admin-withdrawal";

export const WITHDRAWAL_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export const WITHDRAWAL_STATUS_FILTER_OPTIONS: Array<{
  value: WithdrawalStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "processing", label: "Đang xử lý" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" }
];

export const WITHDRAWAL_METHOD_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả phương thức" },
  { value: "bank_transfer", label: "Ngân hàng" },
  { value: "momo", label: "MoMo" },
  { value: "zalopay", label: "ZaloPay" },
  { value: "manual", label: "Thủ công / khác" }
];

export const WITHDRAWAL_RISK_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả mức rủi ro" },
  { value: "normal", label: "Bình thường" },
  { value: "warning", label: "Cảnh báo" },
  { value: "high", label: "Rủi ro cao" }
] as const;

export const WITHDRAWAL_SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "amount_desc", label: "Số tiền cao nhất" },
  { value: "amount_asc", label: "Số tiền thấp nhất" }
] as const;

const STATUS_TO_UI: Record<PayoutRequestStatus, string> = {
  requested: "Chờ duyệt",
  under_review: "Chờ duyệt",
  approved: "Đã duyệt",
  processing: "Đang xử lý",
  completed: "Đã thanh toán",
  rejected: "Bị từ chối",
  cancelled: "Đã hủy",
  failed: "Thất bại"
};

const METHOD_LABEL: Record<PayoutMethod, string> = {
  bank_transfer: "Ngân hàng",
  momo: "MoMo",
  zalopay: "ZaloPay",
  manual: "Thủ công / khác"
};

export function withdrawalStatusLabel(status: PayoutRequestStatus) {
  return STATUS_TO_UI[status] ?? status;
}

export function withdrawalMethodLabel(method: PayoutMethod) {
  return METHOD_LABEL[method] ?? method;
}

export function formatWithdrawalCode(id: string) {
  return `WD-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function formatVnd(amount: number) {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

export function matchesStatusFilter(
  status: PayoutRequestStatus,
  filter: WithdrawalStatusFilter
): boolean {
  if (filter === "all") return true;
  switch (filter) {
    case "pending":
      return status === "requested" || status === "under_review";
    case "approved":
      return status === "approved";
    case "processing":
      return status === "processing";
    case "paid":
      return status === "completed";
    case "rejected":
      return status === "rejected";
    case "failed":
      return status === "failed";
    case "cancelled":
      return status === "cancelled";
    default:
      return true;
  }
}

export function auditActionLabel(action: string) {
  const map: Record<string, string> = {
    approve_payout: "Duyệt yêu cầu",
    reject_payout: "Từ chối",
    payout_paid: "Đánh dấu đã thanh toán",
    payout_processing: "Đánh dấu đang xử lý",
    payout_failed: "Đánh dấu thất bại",
    payout_risk_review: "Chuyển xem xét rủi ro",
    payout_reopen: "Mở lại yêu cầu",
    payout_return_approved: "Trả về đã duyệt"
  };
  return map[action] ?? action;
}
