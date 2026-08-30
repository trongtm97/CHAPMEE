import type {
  ReportReasonCode,
  ReportResolutionCode,
  ReportSeverity,
  ReportTabStatus,
  ReportTargetType
} from "@/types/reports";

export const REPORT_TAB_LABELS: Record<ReportTabStatus, string> = {
  all: "Tất cả",
  pending: "Mới",
  reviewing: "Đang xử lý",
  resolved: "Đã xử lý",
  rejected: "Từ chối",
  urgent: "Khẩn cấp"
};

export const REPORT_TARGET_LABELS: Record<string, string> = {
  story: "Truyện",
  chapter: "Chương",
  episode: "Chương",
  comment: "Bình luận",
  inline_comment: "Bình luận đoạn",
  inline_comment_thread: "Luồng bình luận đoạn",
  story_review: "Đánh giá truyện",
  community_post: "Bài cộng đồng",
  message: "Tin nhắn",
  user: "Tài khoản",
  creator: "Hồ sơ tác giả",
  author_profile: "Hồ sơ tác giả",
  community_group: "Nhóm truyện",
  group: "Nhóm truyện"
};

export const REPORT_REASON_OPTIONS: Array<{ code: ReportReasonCode | string; label: string }> = [
  { code: "spam", label: "Spam / rác" },
  { code: "harassment", label: "Quấy rối / xúc phạm" },
  { code: "hate_or_abuse", label: "Công kích / thù ghét" },
  { code: "hate_speech", label: "Công kích / thù ghét" },
  { code: "sexual_content", label: "Nội dung nhạy cảm" },
  { code: "violence", label: "Bạo lực" },
  { code: "violence_self_harm", label: "Bạo lực / tự hại" },
  { code: "self_harm", label: "Tự hại" },
  { code: "scam_or_fraud", label: "Lừa đảo" },
  { code: "impersonation_scam", label: "Lừa đảo / giả mạo" },
  { code: "impersonation", label: "Giả mạo" },
  { code: "copyright", label: "Bản quyền" },
  { code: "privacy_violation", label: "Xâm phạm riêng tư" },
  { code: "illegal_content", label: "Nội dung bất hợp pháp" },
  { code: "low_quality_or_misleading", label: "Chất lượng thấp / gây hiểu nhầm" },
  { code: "wrong_age_rating", label: "Sai độ tuổi" },
  { code: "wrong_taxonomy_tag", label: "Sai thể loại / tag" },
  { code: "missing_content_warning", label: "Thiếu cảnh báo nội dung" },
  { code: "other", label: "Khác" }
];

export const REPORT_SEVERITY_LABELS: Record<ReportSeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp"
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Mới",
  open: "Mới",
  reviewing: "Đang xử lý",
  resolved: "Đã xử lý",
  resolved_action_taken: "Đã xử lý",
  resolved_no_violation: "Không vi phạm",
  reviewed: "Đã xử lý",
  rejected: "Từ chối",
  rejected_abuse: "Báo cáo lạm dụng",
  escalated: "Đã chuyển cấp"
};

export const REPORT_DISMISS_REASON_OPTIONS: Array<{
  code: ReportResolutionCode;
  label: string;
}> = [
  { code: "no_violation", label: "Không vi phạm" },
  { code: "false_report", label: "Báo cáo sai" },
  { code: "insufficient_evidence", label: "Thiếu bằng chứng" },
  { code: "duplicate", label: "Trùng lặp" },
  { code: "already_handled", label: "Đã xử lý trước đó" }
];

export const REPORT_RESOLVE_OPTIONS: Array<{
  code: ReportResolutionCode;
  label: string;
}> = [
  { code: "warning_sent", label: "Đã cảnh báo người vi phạm" },
  { code: "content_hidden", label: "Đã ẩn nội dung" },
  { code: "content_removed_from_public", label: "Gỡ khỏi hiển thị công khai" },
  { code: "user_restricted", label: "Hạn chế tài khoản" },
  { code: "messaging_restricted", label: "Hạn chế nhắn tin" },
  { code: "sent_to_quality_review", label: "Chuyển chất lượng nội dung" },
  { code: "escalated_to_admin", label: "Chuyển admin cấp cao" },
  { code: "no_action_needed", label: "Không cần xử lý thêm" }
];

export function reportTargetLabel(type: string) {
  return REPORT_TARGET_LABELS[type] ?? type;
}

export function reportReasonLabel(code: string | null | undefined) {
  return (
    REPORT_REASON_OPTIONS.find((o) => o.code === code)?.label ?? code ?? "—"
  );
}

export function reportSeverityLabel(severity: ReportSeverity | string) {
  return REPORT_SEVERITY_LABELS[severity as ReportSeverity] ?? severity;
}

export function reportStatusLabel(status: string) {
  return REPORT_STATUS_LABELS[status] ?? status;
}

export function priorityToSeverity(priority: string | null | undefined): ReportSeverity {
  if (priority === "low") return "low";
  if (priority === "high") return "high";
  if (priority === "urgent") return "urgent";
  return "medium";
}

export function severityToPriority(severity: ReportSeverity): string {
  if (severity === "medium") return "normal";
  return severity;
}

export const PENDING_STATUSES = ["pending", "open"] as const;
export const REVIEWING_STATUSES = ["reviewing"] as const;
export const RESOLVED_STATUSES = [
  "resolved",
  "resolved_action_taken",
  "resolved_no_violation",
  "reviewed"
] as const;
export const REJECTED_STATUSES = ["rejected", "rejected_abuse"] as const;

export function normalizeTargetType(type: string): ReportTargetType {
  if (type === "episode") return "chapter";
  if (type === "creator") return "author_profile";
  if (type === "community_group") return "group";
  return type as ReportTargetType;
}
