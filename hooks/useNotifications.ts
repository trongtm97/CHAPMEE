"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user || isCancelled) {
          setState({ unreadCount: 0, loading: false });
          return;
        }

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null);

        if (!isCancelled) {
          setState({
            unreadCount: count ?? 0,
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
