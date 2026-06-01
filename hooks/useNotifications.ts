"use client";

import { useEffect, useState } from "react";

type UseNotificationsState = {
  unreadCount: number;
  loading: boolean;
};

export function useNotifications() {
  const [state, setState] = useState<UseNotificationsState>({
    unreadCount: 0,
    loading: true
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store"
        });

        if (!response.ok) {
          if (!isCancelled) {
            setState({ unreadCount: 0, loading: false });
          }
          return;
        }

        const payload = (await response.json()) as { unreadCount?: number };
        if (!isCancelled) {
          setState({
            unreadCount: payload.unreadCount ?? 0,
            loading: false
          });
        }
      } catch {
        if (!isCancelled) {
          setState({ unreadCount: 0, loading: false });
        }
      }
    }

    void loadUnreadCount();
    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 30_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
