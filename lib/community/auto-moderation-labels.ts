import type { AutoModerationDecision, ModerationReasonCode } from "@/types/community-auto-moderation";

export const AUTO_DECISION_LABELS: Record<AutoModerationDecision, string> = {
  auto_approved: "Tự động duyệt",
  needs_review: "Chờ duyệt",
  auto_rejected: "Tự động từ chối",
  auto_hidden: "Tự động ẩn",
  rate_limited: "Bị giới hạn đăng"
};

export const REASON_CODE_LABELS: Record<string, string> = {
  trusted_user_auto_approved: "User đáng tin — tự duyệt",
  verified_author_auto_approved: "Tác giả xác thực — tự duyệt",
  low_trust_needs_review: "Điểm tin cậy thấp/trung bình",
  new_account_needs_review: "Tài khoản mới",
  blocked_keyword: "Từ khóa bị chặn",
  review_keyword: "Từ khóa cần duyệt",
  external_link_needs_review: "Link ngoài cần duyệt",
  rate_limited: "Vượt giới hạn đăng",
  duplicate_content: "Nội dung trùng lặp",
  active_strike: "Đang có strike",
  too_many_reports: "Quá nhiều báo cáo",
  too_short: "Bài quá ngắn",
  too_long: "Bài quá dài",
  spam_pattern: "Dấu hiệu spam",
  community_restricted: "Bị hạn chế cộng đồng",
  group_posting_locked: "Nhóm đang khóa đăng",
  auto_moderation_disabled: "Duyệt tự động tắt",
  insufficient_approved_posts: "Chưa đủ bài đã duyệt",
  email_not_verified: "Chưa xác minh email",
  rejected_posts_threshold: "Quá nhiều bài bị từ chối",
  reports_threshold: "Quá nhiều báo cáo hợp lệ",
  external_link_blocked: "Link ngoài không được phép"
};

export function reasonCodeLabel(code: string) {
  return REASON_CODE_LABELS[code] ?? code;
}

export function trustTierLabel(score: number) {
  if (score >= 80) return "Rất đáng tin";
  if (score >= 60) return "Đáng tin";
  if (score >= 30) return "Bình thường";
  return "Rủi ro cao";
}

export const MODE_LABELS = {
  safe: "An toàn",
  balanced: "Cân bằng",
  relaxed: "Mở rộng"
} as const;

export function userMessageForDecision(decision: AutoModerationDecision): string {
  switch (decision) {
    case "auto_approved":
      return "Bài của bạn đã được đăng.";
    case "needs_review":
      return "Bài của bạn đang chờ duyệt.";
    case "auto_rejected":
      return "Bài không thể đăng do vi phạm quy định cộng đồng.";
    case "auto_hidden":
      return "Bài không thể đăng do vi phạm quy định cộng đồng.";
    case "rate_limited":
      return "Bạn đăng quá nhanh. Vui lòng thử lại sau.";
    default:
      return "Bài của bạn đang chờ duyệt.";
  }
}

export type { ModerationReasonCode };
