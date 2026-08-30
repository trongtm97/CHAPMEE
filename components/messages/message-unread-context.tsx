"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/brand/storage";
import { readSessionCache, writeSessionCache } from "@/lib/client/session-cache";
import { createClient } from "@/lib/data/client";

export const MESSAGE_UNREAD_REFRESH_EVENT = STORAGE_KEYS.messageUnreadRefreshEvent;

const UNREAD_CACHE_KEY = STORAGE_KEYS.messageUnread;
const UNREAD_CACHE_KEY_LEGACY = "chapchap:message-unread";
const UNREAD_REFRESH_EVENT_LEGACY = "chapchap:message-unread-refresh";
const UNREAD_CACHE_TTL_MS = 45_000;

type UnreadCounts = {
  messageUnread: number;
  requestUnread: number;
};

export function dispatchMessageUnreadRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MESSAGE_UNREAD_REFRESH_EVENT));
  }
}

type MessageUnreadContextValue = {
  messageUnread: number;
  requestUnread: number;
  refresh: () => Promise<void>;
};

const MessageUnreadContext = createContext<MessageUnreadContextValue | null>(null);

export function useMessageUnread() {
  return useContext(MessageUnreadContext);
}

async function fetchCounts(): Promise<{ messageUnread: number; requestUnread: number }> {
  const res = await fetch("/api/messages/unread", { cache: "no-store" });
  if (!res.ok) {
    return { messageUnread: 0, requestUnread: 0 };
  }
  const data = (await res.json()) as { unread: number; requests: number };
  return {
    messageUnread: data.unread ?? 0,
    requestUnread: data.requests ?? 0
  };
}

function readUnreadCache(): UnreadCounts | null {
  return readSessionCache<UnreadCounts>(
    UNREAD_CACHE_KEY,
    UNREAD_CACHE_TTL_MS,
    UNREAD_CACHE_KEY_LEGACY
  );
}

export function MessageUnreadProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [messageUnread, setMessageUnread] = useState(
    () => readUnreadCache()?.messageUnread ?? 0
  );
  const [requestUnread, setRequestUnread] = useState(
    () => readUnreadCache()?.requestUnread ?? 0
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConversationId = useMemo(() => {
    const match = pathname.match(/^\/messages\/([^/?]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const refresh = useCallback(async () => {
    const counts = await fetchCounts();
    setMessageUnread(counts.messageUnread);
    setRequestUnread(counts.requestUnread);
    writeSessionCache(UNREAD_CACHE_KEY, counts, UNREAD_CACHE_KEY_LEGACY);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void refresh();
    }, 400);
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener(MESSAGE_UNREAD_REFRESH_EVENT, onRefresh);
    window.addEventListener(UNREAD_REFRESH_EVENT_LEGACY, onRefresh);
    return () => {
      window.removeEventListener(MESSAGE_UNREAD_REFRESH_EVENT, onRefresh);
      window.removeEventListener(UNREAD_REFRESH_EVENT_LEGACY, onRefresh);
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    let removeChannel: (() => void) | undefined;

    void (async () => {
      const db = createClient();
      const {
        data: { user }
      } = await db.auth.getUser();
      if (!user || cancelled) {
        return;
      }

      const channel = db
        .channel(`message-unread:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const row = payload.new as Record<string, unknown> | undefined;
            if (!row || typeof row.sender_id !== "string") {
              return;
            }
            if (row.sender_id === user.id) {
              return;
            }
            const convId =
              typeof row.conversation_id === "string" ? row.conversation_id : null;
            if (convId && convId === activeConversationId) {
              return;
            }
            scheduleRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_requests",
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            scheduleRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "message_requests",
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            scheduleRefresh();
          }
        )
        .subscribe();

      if (cancelled) {
        void db.removeChannel(channel);
        return;
      }

      removeChannel = () => {
        void db.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      removeChannel?.();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [activeConversationId, scheduleRefresh]);

  const value = useMemo(
    () => ({ messageUnread, requestUnread, refresh }),
    [messageUnread, requestUnread, refresh]
  );

  return (
    <MessageUnreadContext.Provider value={value}>
      {children}
    </MessageUnreadContext.Provider>
  );
}
