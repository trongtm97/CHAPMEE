import type {
  DefaultDmPolicy,
  MessagingRestrictionType,
  MessagingRestrictReasonCode,
  MessageSafetyDecisionType,
  MessageSafetyRiskLevel,
  ViolationTypeCode
} from "@/types/messaging-safety";

export const MESSAGING_RESTRICTION_LABELS: Record<MessagingRestrictionType, string> = {
  mute_24h: "Hạn chế 24h",
  mute_7d: "Hạn chế 7 ngày",
  mute_30d: "Hạn chế 30 ngày",
  permanent_messaging_ban: "Cấm nhắn vĩnh viễn",
  link_block_only: "Cấm gửi link",
  strangers_block_only: "Chỉ được nhắn người đã follow qua lại",
  author_dm_block_only: "Cấm nhắn tác giả"
};

export const MESSAGING_RESTRICT_REASON_LABELS: Record<
  MessagingRestrictReasonCode,
  string
> = {
  spam: "Spam tin nhắn",
  inappropriate_link: "Gửi link không phù hợp",
  harassment: "Quấy rối người dùng",
  author_harassment: "Quấy rối tác giả",
  profanity: "Tục tĩu/xúc phạm",
  scam: "Lừa đảo",
  impersonation: "Giả mạo",
  personal_info: "Tiết lộ thông tin cá nhân",
  other: "Khác"
};

export const VIOLATION_TYPE_LABELS: Record<ViolationTypeCode, string> = {
  spam: "Spam",
  external_link: "Link ngoài",
  profanity: "Tục tĩu",
  harassment: "Quấy rối",
  scam: "Lừa đảo",
  impersonation: "Giả mạo",
  author_spam: "Spam tác giả",
  sexual: "Nội dung tình dục",
  personal_info: "Tiết lộ thông tin cá nhân"
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: "Mở",
  reviewing: "Đang xử lý",
  resolved: "Đã xử lý",
  dismissed: "Không vi phạm",
  rejected: "Từ chối"
};

export const RISK_LEVEL_LABELS: Record<MessageSafetyRiskLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng"
};

export const DECISION_LABELS: Record<MessageSafetyDecisionType, string> = {
  allowed: "Cho phép",
  blocked: "Bị chặn",
  needs_review: "Chờ duyệt",
  rate_limited: "Giới hạn tốc độ"
};

export const DM_POLICY_LABELS: Record<DefaultDmPolicy, string> = {
  open: "Ai cũng có thể nhắn",
  mutual_follow_only: "Chỉ người đã follow nhau",
  request_first: "Yêu cầu nhắn tin trước",
  disabled: "Tắt tin nhắn"
};

export const REASON_CODE_LABELS: Record<string, string> = {
  blocked_keyword: "Từ khóa bị chặn",
  review_keyword: "Từ khóa cần duyệt",
  external_link_blocked: "Link ngoài bị chặn",
  new_account_limit: "Giới hạn tài khoản mới",
  unverified_limit: "Giới hạn chưa xác minh",
  duplicate_message: "Tin trùng lặp",
  too_many_recipients: "Quá nhiều người nhận",
  author_protection: "Bảo vệ tác giả",
  user_restricted: "Người dùng bị hạn chế",
  spam_pattern: "Mẫu spam",
  reported_context: "Ngữ cảnh báo cáo",
  link_first_message: "Link trong tin đầu",
  link_stranger: "Link với người lạ",
  spam_link: "Link spam",
  risky_link: "Link rủi ro"
};

export function restrictionEndsAt(
  type: MessagingRestrictionType,
  from = new Date()
): Date | null {
  switch (type) {
    case "mute_24h":
      return new Date(from.getTime() + 24 * 60 * 60 * 1000);
    case "mute_7d":
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "mute_30d":
      return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "permanent_messaging_ban":
    case "link_block_only":
    case "strangers_block_only":
    case "author_dm_block_only":
      return null;
  }
}
