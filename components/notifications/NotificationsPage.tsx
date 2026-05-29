"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { markAllNotificationsAsReadAction } from "@/lib/actions/notifications";
import { filterNotificationsByTab } from "@/lib/notifications/filter-notifications";
import { NotificationEmptyState } from "@/components/notifications/NotificationEmptyState";
import { NotificationHeader } from "@/components/notifications/NotificationHeader";
import { NotificationList } from "@/components/notifications/NotificationList";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { NotificationTabs } from "@/components/notifications/NotificationTabs";
import type {
  NotificationFilterTab,
  NotificationItem
} from "@/types/notification";

type NotificationsPageProps = {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
  pageSize?: number;
  usingMockData?: boolean;
};

export function NotificationsPage({
  initialItems,
  initialUnreadCount,
  pageSize = 20,
  usingMockData = false
}: NotificationsPageProps) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [offset, setOffset] = useState(initialItems.length);
  const [tab, setTab] = useState<NotificationFilterTab>("all");
  const [hasMore, setHasMore] = useState(!usingMockData && initialItems.length >= pageSize);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();
  const [isMarkingAll, startMarkAll] = useTransition();

  const visibleItems = useMemo(() => filterNotificationsByTab(items, tab), [items, tab]);

  const loadNotifications = useCallback(
    (nextTab: NotificationFilterTab, nextOffset: number, append: boolean) => {
      if (usingMockData) {
        const filtered = filterNotificationsByTab(items, nextTab);
        setHasMore(false);
        if (!append) {
          setItems(filtered);
          setOffset(filtered.length);
        }
        return;
      }

      const run = append ? startLoadMore : startLoading;
      run(async () => {
        setLoadError(null);
        try {
          const response = await fetch(
            `/api/notifications?tab=${nextTab}&offset=${nextOffset}&limit=${pageSize}`,
            { cache: "no-store" }
          );
          if (!response.ok) {
            throw new Error("Không thể tải thông báo.");
          }
          const payload = (await response.json()) as {
            items: NotificationItem[];
            unreadCount: number;
          };
          setUnreadCount(payload.unreadCount);
          setHasMore(payload.items.length >= pageSize);
          setOffset(nextOffset + payload.items.length);
          setItems((prev) => (append ? [...prev, ...payload.items] : payload.items));
        } catch (error) {
          setLoadError(
            error instanceof Error ? error.message : "Không thể tải thông báo."
          );
        }
      });
    },
    [items, pageSize, usingMockData]
  );

  function onChangeTab(nextTab: NotificationFilterTab) {
    setTab(nextTab);
    if (usingMockData) {
      return;
    }
    setOffset(0);
    setHasMore(true);
    loadNotifications(nextTab, 0, false);
  }

  function handleItemRead(id: string) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && !target.read_at) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.map((item) =>
        item.id === id && !item.read_at
          ? { ...item, read_at: new Date().toISOString() }
          : item
      );
    });
  }

  function handleMarkAllRead() {
    startMarkAll(async () => {
      if (!usingMockData) {
        await markAllNotificationsAsReadAction();
      }
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    });
  }

  const showSkeleton = isLoading && !usingMockData && items.length === 0;

  return (
    <section className="space-y-3 pb-2 lg:space-y-4">
      <NotificationHeader unreadCount={unreadCount} />

      <div className="flex items-center justify-between gap-2">
        <NotificationTabs activeTab={tab} onChange={onChangeTab} />
      </div>

      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <button
            className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
            disabled={isMarkingAll}
            onClick={handleMarkAllRead}
            type="button"
          >
            {isMarkingAll ? "Đang cập nhật…" : "Đánh dấu đã đọc tất cả"}
          </button>
        </div>
      ) : null}

      {usingMockData ? (
        <p className="text-[11px] text-zinc-500">
          Đang hiển thị dữ liệu mẫu để xem trước giao diện.
        </p>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-center">
          <p className="text-sm text-red-200">{loadError}</p>
          <button
            className="mt-2 text-xs font-semibold text-cyan-300"
            onClick={() => loadNotifications(tab, 0, false)}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {showSkeleton ? <NotificationSkeleton /> : null}

      {!showSkeleton && !loadError && visibleItems.length === 0 ? (
        <NotificationEmptyState />
      ) : null}

      {!showSkeleton && !loadError && visibleItems.length > 0 ? (
        <>
          <NotificationList items={visibleItems} onItemRead={handleItemRead} />
          {hasMore && !usingMockData ? (
            <button
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] text-sm font-semibold text-zinc-200 transition hover:border-cyan-300/30 disabled:opacity-50"
              disabled={isLoadingMore}
              onClick={() => loadNotifications(tab, offset, true)}
              type="button"
            >
              {isLoadingMore ? "Đang tải…" : "Tải thêm"}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
