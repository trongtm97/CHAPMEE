import type {
  RefundCoinType,
  RefundDashboardFilters,
  RefundSource,
  RefundStatus,
  RefundType
} from "@/types/admin-refund";

export const REFUND_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "approved", label: "Đã duyệt" },
  { value: "processing", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn tất" },
  { value: "rejected", label: "Từ chối" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã hủy" }
] as const;

export const REFUND_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại hoàn" },
  { value: "chapter_unlock_refund", label: "Hoàn mở khóa chương" },
  { value: "story_purchase_refund", label: "Hoàn mua truyện" },
  { value: "tip_refund", label: "Hoàn tip" },
  { value: "gift_refund", label: "Hoàn quà tặng" },
  { value: "vip_refund", label: "Hoàn VIP" },
  { value: "fanclub_refund", label: "Hoàn Fanclub" },
  { value: "quality_low_refund", label: "Hoàn do chất lượng thấp" },
  { value: "violation_refund", label: "Hoàn do vi phạm" },
  { value: "admin_manual_refund", label: "Hoàn thủ công (admin)" },
  { value: "duplicate_payment_refund", label: "Hoàn trùng thanh toán" },
  { value: "system_error_refund", label: "Hoàn lỗi hệ thống" },
  { value: "coin_purchase_refund", label: "Hoàn mua coin" }
] as const;

export const REFUND_SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả nguồn" },
  { value: "user_request", label: "Yêu cầu người dùng" },
  { value: "admin_manual", label: "Admin thủ công" },
  { value: "content_quality_action", label: "Xử lý chất lượng nội dung" },
  { value: "moderation_action", label: "Kiểm duyệt" },
  { value: "payment_error", label: "Lỗi thanh toán" },
  { value: "chargeback_related", label: "Liên quan chargeback" }
] as const;

export const REFUND_COIN_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại coin" },
  { value: "paid_coin", label: "Paid coin" },
  { value: "bonus_coin", label: "Bonus coin" }
] as const;

export const REFUND_SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "coin_desc", label: "Coin cao → thấp" },
  { value: "coin_asc", label: "Coin thấp → cao" }
] as const;

const STATUS_LABELS: Record<RefundStatus, string> = {
  pending: "Chờ xử lý",
  reviewing: "Đang xem xét",
  approved: "Đã duyệt",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  rejected: "Từ chối",
  failed: "Thất bại",
  cancelled: "Đã hủy"
};

const TYPE_LABELS: Record<RefundType, string> = {
  chapter_unlock_refund: "Hoàn mở khóa chương",
  story_purchase_refund: "Hoàn mua truyện",
  tip_refund: "Hoàn tip",
  gift_refund: "Hoàn quà tặng",
  vip_refund: "Hoàn VIP",
  fanclub_refund: "Hoàn Fanclub",
  quality_low_refund: "Hoàn chất lượng thấp",
  violation_refund: "Hoàn vi phạm",
  admin_manual_refund: "Hoàn thủ công",
  duplicate_payment_refund: "Hoàn trùng thanh toán",
  system_error_refund: "Hoàn lỗi hệ thống",
  coin_purchase_refund: "Hoàn mua coin"
};

const SOURCE_LABELS: Record<RefundSource, string> = {
  user_request: "Yêu cầu người dùng",
  admin_manual: "Admin thủ công",
  content_quality_action: "Chất lượng nội dung",
  moderation_action: "Kiểm duyệt",
  payment_error: "Lỗi thanh toán",
  chargeback_related: "Chargeback"
};

export function refundStatusLabel(status: string) {
  return STATUS_LABELS[status as RefundStatus] ?? status;
}

export function refundTypeLabel(type: string | null) {
  if (!type) return "—";
  return TYPE_LABELS[type as RefundType] ?? type;
}

export function refundSourceLabel(source: string | null) {
  if (!source) return "—";
  return SOURCE_LABELS[source as RefundSource] ?? source;
}

export function formatRefundId(id: string) {
  return `RF-${id.slice(0, 8).toUpperCase()}`;
}

export function formatCoin(amount: number) {
  return `${amount.toLocaleString("vi-VN")} coin`;
}

export function formatVnd(amount: number | null) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

export function computeSlaHours(createdAt: string, status: string) {
  if (status === "completed" || status === "rejected" || status === "cancelled") {
    return null;
  }
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(hours));
}

export function inferRefundTypeFromTransaction(txType: string): RefundType {
  switch (txType) {
    case "chapter_unlock":
      return "chapter_unlock_refund";
    case "story_unlock":
      return "story_purchase_refund";
    case "author_tip":
      return "tip_refund";
    case "virtual_gift":
      return "gift_refund";
    case "vip_subscription":
      return "vip_refund";
    case "fan_club_subscription":
      return "fanclub_refund";
    case "coin_purchase":
      return "coin_purchase_refund";
    default:
      return "admin_manual_refund";
  }
}

export function getDefaultRefundFilters(pageSize = 25): RefundDashboardFilters {
  return {
    search: "",
    status: "all",
    refundType: "all",
    source: "all",
    coinType: "all",
    startDate: "",
    endDate: "",
    highRiskOnly: false,
    creatorUserId: "",
    storyId: "",
    chapterId: "",
    page: 1,
    pageSize,
    selectedId: null,
    sort: "newest",
    createMode: false,
    prefilledTx: "",
    prefilledUserId: ""
  };
}

export function buildRefundFilterQuery(filters: RefundDashboardFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.refundType !== "all") params.set("type", filters.refundType);
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.coinType !== "all") params.set("coinType", filters.coinType);
  if (filters.startDate) params.set("from", filters.startDate);
  if (filters.endDate) params.set("to", filters.endDate);
  if (filters.highRiskOnly) params.set("highRisk", "1");
  if (filters.creatorUserId) params.set("creator", filters.creatorUserId);
  if (filters.storyId) params.set("story", filters.storyId);
  if (filters.chapterId) params.set("chapter", filters.chapterId);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== 25) params.set("pageSize", String(filters.pageSize));
  if (filters.selectedId) params.set("id", filters.selectedId);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.createMode) params.set("create", "1");
  if (filters.prefilledTx) params.set("tx", filters.prefilledTx);
  if (filters.prefilledUserId) params.set("userId", filters.prefilledUserId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parseRefundFilters(
  params: Record<string, string | string[] | undefined>
): RefundDashboardFilters {
  const read = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
  };
  const page = Math.max(1, Number(read("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(read("pageSize")) || 25));
  return {
    search: read("q"),
    status: (read("status") || "all") as RefundDashboardFilters["status"],
    refundType: (read("type") || "all") as RefundDashboardFilters["refundType"],
    source: (read("source") || "all") as RefundDashboardFilters["source"],
    coinType: (read("coinType") || "all") as RefundCoinType | "all",
    startDate: read("from"),
    endDate: read("to"),
    highRiskOnly: read("highRisk") === "1",
    creatorUserId: read("creator"),
    storyId: read("story"),
    chapterId: read("chapter"),
    page,
    pageSize,
    selectedId: read("id") || null,
    sort: (read("sort") || "newest") as RefundDashboardFilters["sort"],
    createMode: read("create") === "1",
    prefilledTx: read("tx"),
    prefilledUserId: read("userId")
  };
}
