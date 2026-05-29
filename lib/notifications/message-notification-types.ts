import type { NotificationType } from "@/types/notification";

export const MESSAGE_NOTIFICATION_TYPES = new Set<NotificationType>([
  "new_message",
  "new_message_request",
  "message_request_accepted",
  "message_report_resolved",
  "message_restriction_applied"
]);

export function isMessageNotificationType(type: NotificationType): boolean {
  return MESSAGE_NOTIFICATION_TYPES.has(type);
}
