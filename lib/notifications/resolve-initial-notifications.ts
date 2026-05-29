import { getMockNotifications } from "@/lib/notifications/mock-notifications";
import type { NotificationItem } from "@/types/notification";

export function resolveInitialNotifications(
  userId: string,
  items: NotificationItem[],
  options?: { allowMock?: boolean }
): NotificationItem[] {
  if (items.length > 0) {
    return items;
  }

  if (options?.allowMock) {
    return getMockNotifications(userId);
  }

  return items;
}
