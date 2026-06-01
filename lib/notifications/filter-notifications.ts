import type { NotificationFilterTab, NotificationItem } from "@/types/notification";

export function filterNotificationsByTab(
  items: NotificationItem[],
  tab: NotificationFilterTab
): NotificationItem[] {
  if (tab === "unread") {
    return items.filter((item) => !item.read_at);
  }

  if (tab === "read") {
    return items.filter((item) => Boolean(item.read_at));
  }

  return items;
}
