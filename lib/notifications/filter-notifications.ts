import { getNotificationCategory } from "@/lib/notifications/notification-categories";
import type {
  NotificationCategory,
  NotificationFilterTab,
  NotificationItem
} from "@/types/notification";

export function filterNotificationsByTab(
  items: NotificationItem[],
  tab: NotificationFilterTab
): NotificationItem[] {
  if (tab === "all") {
    return items;
  }

  if (tab === "unread") {
    return items.filter((item) => !item.read_at);
  }

  const category = tab as NotificationCategory;
  return items.filter((item) => getNotificationCategory(item.type) === category);
}
