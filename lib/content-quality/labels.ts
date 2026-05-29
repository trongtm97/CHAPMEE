import type {
  ContentQualityListTab,
  ContentQualityReasonCode,
  ContentQualityStatus
} from "@/types/content-quality";

export const QUALITY_STATUS_LABELS: Record<ContentQualityStatus, string> = {
  appealed: "Đang khiếu nại",
  good: "Tốt",
  low_quality_final_review: "Đang xét duyệt lần cuối",
  low_quality_warning_1: "Cảnh báo lần 1",
  low_quality_warning_2: "Cảnh báo lần 2",
  needs_attention: "Cần chú ý",
  pending_quality_review: "Đang chờ xét duyệt",
  permanently_hidden_low_quality: "Đã ẩn vĩnh viễn do chất lượng thấp",
  restored: "Đã khôi phục"
};

export const QUALITY_REASON_LABELS: Record<ContentQualityReasonCode, string> = {
  duplicate_or_repetitive_content: "Nội dung lặp lại",
  high_early_drop_rate: "Nhiều người bỏ đọc sớm",
  incomplete_story: "Truyện chưa hoàn chỉnh",
  low_user_rating: "Đánh giá người đọc thấp",
  misleading_title: "Tiêu đề gây hiểu nhầm",
  moderator_confirmed_low_quality: "Moderator xác nhận chất lượng thấp",
  policy_related_quality_issue: "Vấn đề chất lượng liên quan chính sách",
  poor_formatting: "Trình bày khó đọc",
  repeated_reports: "Nhiều báo cáo hợp lệ",
  too_short_content: "Nội dung quá ngắn"
};

export const QUALITY_TAB_LABELS: Record<ContentQualityListTab, string> = {
  all: "Tất cả",
  in_review: "Đang xét duyệt",
  needs_action: "Cần xử lý",
  permanently_hidden: "Đã ẩn vĩnh viễn",
  restored: "Đã khôi phục"
};

export function qualityStatusLabel(status: ContentQualityStatus) {
  return QUALITY_STATUS_LABELS[status] ?? status;
}

export function qualityReasonLabel(code: ContentQualityReasonCode) {
  return QUALITY_REASON_LABELS[code] ?? code;
}

export function statusForAttempt(attempt: number): ContentQualityStatus {
  if (attempt <= 0) {
    return "good";
  }

  if (attempt === 1) {
    return "low_quality_warning_1";
  }

  if (attempt === 2) {
    return "low_quality_warning_2";
  }

  return "low_quality_final_review";
}

export function isNeedsActionStatus(status: ContentQualityStatus) {
  return (
    status === "needs_attention" ||
    status === "low_quality_warning_1" ||
    status === "low_quality_warning_2" ||
    status === "low_quality_final_review"
  );
}

export function canResubmitQualityStatus(status: ContentQualityStatus, attempt: number) {
  return (
    attempt > 0 &&
    attempt < 3 &&
    (status === "low_quality_warning_1" ||
      status === "low_quality_warning_2" ||
      status === "low_quality_final_review" ||
      status === "needs_attention")
  );
}
