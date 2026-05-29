"use client";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { NotificationItem as NotificationItemType } from "@/types/notification";

type NotificationListProps = {
  items: NotificationItemType[];
  onItemRead: (id: string) => void;
};

export function NotificationList({ items, onItemRead }: NotificationListProps) {
  return (
    <div className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      {items.map((item) => (
        <NotificationItem item={item} key={item.id} onRead={onItemRead} />
      ))}
    </div>
  );
}
