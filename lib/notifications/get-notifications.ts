import { filterNotificationsByTab } from "@/lib/notifications/filter-notifications";
import type { NotificationFilterTab, NotificationItem } from "@/types/notification";
import { getUserNotifications } from "@/lib/data/notifications";

export { filterNotificationsByTab } from "@/lib/notifications/filter-notifications";

export type GetNotificationsInput = {
  userId: string;
  limit?: number;
  offset?: number;
  tab?: NotificationFilterTab;
};

export async function getNotifications(input: GetNotificationsInput): Promise<NotificationItem[]> {
  const tab = input.tab ?? "all";
  const unreadOnly = tab === "unread";

  const items = await getUserNotifications({
    userId: input.userId,
    limit: input.limit ?? 20,
    offset: input.offset ?? 0,
    group: "all",
    unreadOnly
  });

  return filterNotificationsByTab(items, tab);
}
