import type { FeedbackStatus } from "@/types/contact-settings";

/** Valid status transitions for non-super-admin */
export const FEEDBACK_STATUS_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
  new: ["reviewing", "rejected"],
  reviewing: ["need_more_info", "replied", "resolved", "rejected"],
  need_more_info: ["replied", "reviewing", "rejected"],
  replied: ["resolved", "need_more_info", "closed"],
  resolved: ["closed", "reviewing"],
  closed: [],
  rejected: []
};

export function canTransitionFeedbackStatus(
  from: FeedbackStatus,
  to: FeedbackStatus,
  isSuperAdmin = false
): boolean {
  if (from === to) return true;
  if (isSuperAdmin) return true;
  return FEEDBACK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedNextStatuses(
  current: FeedbackStatus,
  isSuperAdmin = false
): FeedbackStatus[] {
  if (isSuperAdmin) {
    return [
      "new",
      "reviewing",
      "need_more_info",
      "replied",
      "resolved",
      "closed",
      "rejected"
    ];
  }
  return [current, ...(FEEDBACK_STATUS_TRANSITIONS[current] ?? [])];
}
