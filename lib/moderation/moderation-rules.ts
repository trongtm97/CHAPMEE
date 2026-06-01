import type {
  ModerationActionType,
  PolicyArea,
  ReportReasonCode,
  ViolationSeverity
} from "@/types/moderation";

export const REPORT_REASON_OPTIONS: {
  value: ReportReasonCode;
  label: string;
}[] = [
  { value: "spam", label: "Spam / quảng cáo" },
  { value: "harassment", label: "Quấy rối / xúc phạm" },
  { value: "hate_speech", label: "Thù ghét / phân biệt" },
  { value: "privacy_violation", label: "Tiết lộ thông tin cá nhân" },
  { value: "sexual_content", label: "Nội dung tình dục không phù hợp" },
  { value: "violence_self_harm", label: "Bạo lực / tự hại" },
  { value: "copyright", label: "Vi phạm bản quyền" },
  { value: "impersonation_scam", label: "Giả mạo / lừa đảo" },
  { value: "wrong_age_rating", label: "Sai phân loại độ tuổi" },
  { value: "wrong_taxonomy_tag", label: "Sai thể loại / tag" },
  { value: "missing_content_warning", label: "Thiếu cảnh báo nội dung" },
  { value: "illegal_content", label: "Nội dung bất hợp pháp" },
  { value: "other", label: "Khác" }
];

export const AGE_RATING_OPTIONS: {
  value: import("@/types/moderation").StoryAgeRating;
  label: string;
  description: string;
}[] = [
  {
    value: "all_ages",
    label: "Mọi độ tuổi",
    description: "Phù hợp mọi lứa tuổi, không có nội dung nhạy cảm."
  },
  {
    value: "teen_13",
    label: "13+",
    description: "Có thể có ngôn ngữ nhẹ hoặc chủ đề phù hợp thanh thiếu niên."
  },
  {
    value: "young_adult_16",
    label: "16+",
    description: "Có thể có bạo lực nhẹ, tình cảm hoặc chủ đề trưởng thành vừa phải."
  },
  {
    value: "mature_18",
    label: "18+",
    description: "Nội dung dành cho người trưởng thành. Độc giả cần xác nhận trước khi đọc."
  }
];

export const SENSITIVE_FLAG_OPTIONS: {
  value: import("@/types/moderation").SensitiveFlag;
  label: string;
}[] = [
  { value: "violence", label: "Bạo lực" },
  { value: "horror", label: "Kinh dị" },
  { value: "strong_language", label: "Ngôn ngữ mạnh" },
  { value: "sexual_themes", label: "Tình cảm trưởng thành" },
  { value: "self_harm_theme", label: "Tự hại / tâm lý nặng" },
  { value: "substance_use", label: "Rượu / thuốc / chất kích thích" },
  { value: "abuse_theme", label: "Lạm dụng / bạo hành" }
];

export const MATURE_18_WARNING =
  "Truyện 18+ có thể bị giới hạn hiển thị với người đọc chưa đủ tuổi.";

export const GUIDELINES_ACK_MESSAGE =
  "Tôi xác nhận truyện này do tôi sở hữu hoặc có quyền đăng, và nội dung tuân thủ Quy định cộng đồng ChapMee.";

export const EPISODE_GUIDELINES_ACK_MESSAGE =
  "Tôi xác nhận chương này tuân thủ Quy định cộng đồng ChapMee và phân loại độ tuổi của truyện.";

export function reasonCodeToPolicyArea(reason: ReportReasonCode): PolicyArea {
  const map: Record<ReportReasonCode, PolicyArea> = {
    spam: "spam",
    harassment: "harassment",
    hate_speech: "hate_speech",
    privacy_violation: "privacy",
    sexual_content: "sexual_content",
    violence_self_harm: "violence",
    copyright: "copyright",
    impersonation_scam: "scam",
    wrong_age_rating: "age_rating",
    wrong_taxonomy_tag: "platform_integrity",
    missing_content_warning: "age_rating",
    illegal_content: "safety",
    other: "platform_integrity"
  };
  return map[reason] ?? "platform_integrity";
}

export function defaultSeverityForAction(
  action: ModerationActionType
): ViolationSeverity {
  switch (action) {
    case "warn":
      return "warning";
    case "remove_content":
    case "hide_content":
    case "age_restrict":
      return "minor";
    case "restrict_commenting":
    case "restrict_posting":
    case "restrict_story_publishing":
      return "moderate";
    case "hold_monetization":
    case "hold_payout":
    case "suspend_account":
      return "severe";
    case "ban_account":
      return "critical";
    default:
      return "warning";
  }
}

export function strikePointsForSeverity(severity: ViolationSeverity): number {
  switch (severity) {
    case "warning":
      return 0;
    case "minor":
      return 1;
    case "moderate":
      return 1;
    case "severe":
      return 2;
    case "critical":
      return 3;
    default:
      return 0;
  }
}

export function restrictionDurationHours(
  severity: ViolationSeverity,
  action: ModerationActionType
): number | null {
  if (action === "ban_account") {
    return null;
  }
  if (action === "suspend_account") {
    return severity === "critical" ? null : 24 * 7;
  }
  switch (severity) {
    case "moderate":
      return 24;
    case "severe":
      return 24 * 7;
    case "critical":
      return 24 * 30;
    default:
      return null;
  }
}

export function restrictionTypeForAction(
  action: ModerationActionType
): import("@/types/moderation").RestrictionType | null {
  switch (action) {
    case "restrict_commenting":
      return "comment_block";
    case "restrict_posting":
      return "post_block";
    case "restrict_story_publishing":
      return "story_publish_block";
    case "hold_monetization":
      return "creator_monetization_hold";
    case "hold_payout":
      return "payout_hold";
    case "suspend_account":
      return "account_suspended";
    case "ban_account":
      return "account_banned";
    default:
      return null;
  }
}

export const MODERATOR_ACTION_OPTIONS: {
  value: ModerationActionType;
  label: string;
}[] = [
  { value: "no_action", label: "Không vi phạm" },
  { value: "warn", label: "Cảnh cáo" },
  { value: "remove_content", label: "Gỡ nội dung" },
  { value: "hide_content", label: "Ẩn nội dung" },
  { value: "age_restrict", label: "Gắn nhãn 18+" },
  { value: "restrict_commenting", label: "Hạn chế bình luận" },
  { value: "restrict_posting", label: "Hạn chế đăng bài" },
  { value: "restrict_story_publishing", label: "Hạn chế đăng truyện" },
  { value: "hold_monetization", label: "Giữ kiếm tiền" },
  { value: "hold_payout", label: "Giữ rút tiền" },
  { value: "suspend_account", label: "Tạm khóa tài khoản" },
  { value: "ban_account", label: "Khóa vĩnh viễn" }
];
