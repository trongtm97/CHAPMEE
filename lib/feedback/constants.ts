import type {
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType
} from "@/types/contact-settings";

export const ALL_FEEDBACK_TYPES: FeedbackType[] = [
  "suggestion",
  "bug",
  "complaint",
  "payment_coin",
  "story_chapter",
  "account",
  "safety_abuse",
  "other",
  "feature",
  "payment",
  "content_report",
  "partnership"
];

export const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  suggestion: "Góp ý",
  feature: "Góp ý",
  bug: "Báo lỗi",
  complaint: "Khiếu nại",
  payment: "Thanh toán / Coin",
  payment_coin: "Thanh toán / Coin",
  story_chapter: "Truyện / Chương",
  content_report: "Truyện / Chương",
  account: "Tài khoản",
  safety_abuse: "An toàn / Lạm dụng",
  partnership: "Liên hệ hợp tác",
  other: "Khác",
  feedback: "Khác"
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "Mới",
  reviewing: "Đang xử lý",
  need_more_info: "Cần thêm thông tin",
  replied: "Đã phản hồi",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
  rejected: "Không hợp lệ"
};

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp"
};

export const FEEDBACK_PRIORITY_CLASS: Record<FeedbackPriority, string> = {
  low: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  normal: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  high: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  urgent: "border-rose-400/30 bg-rose-400/10 text-rose-100"
};

export const FEEDBACK_STATUS_CLASS: Record<FeedbackStatus, string> = {
  new: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  reviewing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  need_more_info: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  replied: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  closed: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  rejected: "border-red-400/30 bg-red-400/10 text-red-100"
};

export function normalizeFeedbackType(value: string): FeedbackType {
  const map: Record<string, FeedbackType> = {
    feedback: "other",
    feature: "suggestion",
    payment: "payment_coin",
    content_report: "story_chapter",
    partnership: "other"
  };
  if (map[value]) return map[value];
  if (ALL_FEEDBACK_TYPES.includes(value as FeedbackType)) {
    return value as FeedbackType;
  }
  return "other";
}

export function getFeedbackTypeLabel(type: FeedbackType | string) {
  return FEEDBACK_TYPE_LABELS[normalizeFeedbackType(type)] ?? type;
}

export function getFeedbackStatusLabel(status: string) {
  return FEEDBACK_STATUS_LABELS[status as FeedbackStatus] ?? status;
}

export function getFeedbackPriorityLabel(priority: string) {
  return FEEDBACK_PRIORITY_LABELS[priority as FeedbackPriority] ?? priority;
}

export function formatFeedbackCode(code: string | null | undefined, id: string) {
  if (code?.trim()) return code;
  return `FB-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
