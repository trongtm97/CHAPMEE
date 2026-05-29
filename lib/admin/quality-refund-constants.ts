export const QUALITY_REFUND_CONFIRM_COIN_THRESHOLD = 100_000;

export const MONETIZATION_STATUS_LABELS: Record<string, string> = {
  paid: "Trả phí",
  free: "Miễn phí",
  disabled: "Đã tắt kiếm tiền",
  free_due_to_quality: "Miễn phí do chất lượng",
  disabled_due_to_quality: "Tắt kiếm tiền do chất lượng"
};

export const QUALITY_REFUND_SCOPE_LABELS: Record<string, string> = {
  all_purchases: "Toàn bộ người đã mua",
  last_7_days: "Mua trong 7 ngày gần nhất",
  last_30_days: "Mua trong 30 ngày gần nhất",
  custom_range: "Khoảng ngày tùy chọn"
};

export const QUALITY_REFUND_REASON_LABELS: Record<string, string> = {
  quality_low: "Nội dung chất lượng thấp",
  free_after_purchase: "Nội dung bị mở miễn phí sau khi mua",
  content_hidden: "Nội dung bị ẩn",
  other: "Lý do khác"
};

export const FREE_ACCESS_REASON_LABELS: Record<string, string> = {
  quality_low: "Chất lượng thấp",
  policy_violation: "Vi phạm chính sách",
  author_request: "Theo yêu cầu tác giả",
  admin_decision: "Quyết định admin",
  refund_case: "Xử lý hoàn coin",
  other: "Khác"
};
