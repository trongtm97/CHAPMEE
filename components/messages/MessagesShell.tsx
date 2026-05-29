"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InboxPatchContext } from "@/components/messages/inbox-patch-context";
import { InboxList } from "@/components/messages/InboxList";
import { filterInboxItems, InboxSearch } from "@/components/messages/InboxSearch";
import { MessageRequestList } from "@/components/messages/MessageRequestList";
import {
  clearInboxUnread,
  mergeInboxOnMessageInsert
} from "@/lib/messages/merge-inbox-on-message";
import { sumInboxUnread } from "@/lib/messages/format-unread-badge";
import { subscribeToInbox } from "@/lib/messages/realtime";
import { useMessageUnread } from "@/components/messages/message-unread-context";
import type { InboxConversationItem, MessageRequestItem } from "@/types/messages";

type MessagesShellProps = {
  conversations: InboxConversationItem[];
  requests: MessageRequestItem[];
  currentUserId: string;
  activeConversationId?: string | null;
  requestsTab?: boolean;
  children?: React.ReactNode;
};

export function MessagesShell({
  conversations: initialConversations,
  requests,
  currentUserId,
  activeConversationId,
  requestsTab = false,
  children
}: MessagesShellProps) {
  const router = useRouter();
  const globalUnread = useMessageUnread();
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState(initialConversations);
  const [requestCount, setRequestCount] = useState(requests.length);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setRequestCount(requests.length);
  }, [requests]);

  const inboxTabBadge = useMemo(
    () => sumInboxUnread(conversations),
    [conversations]
  );

  const requestsTabBadge = globalUnread?.requestUnread ?? requestCount;

  const patchInboxUnread = useCallback((conversationId: string) => {
    setConversations((prev) => clearInboxUnread(prev, conversationId));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToInbox(currentUserId, {
      onMessageInsert: (row) => {
        setConversations((prev) => {
          const existed = prev.some((c) => c.id === row.conversation_id);
          const next = mergeInboxOnMessageInsert(prev, {
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            body: row.body,
            createdAt: row.created_at,
            currentUserId,
            activeConversationId: activeConversationId ?? null
          });
          if (!existed && row.sender_id !== currentUserId) {
            router.refresh();
          }
          return next;
        });
      },
      onConversationUpdate: (conv) => {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === conv.id);
          if (idx < 0) return prev;
          const item = prev[idx];
          const updated = {
            ...item,
            lastMessagePreview: conv.last_message_preview ?? item.lastMessagePreview,
            lastMessageAt: conv.last_message_at ?? item.lastMessageAt
          };
          const rest = prev.filter((_, i) => i !== idx);
          return [updated, ...rest];
        });
      },
      onParticipantReadUpdate: () => {
        /* read receipts handled in conversation view */
      }
    });

    return unsubscribe;
  }, [currentUserId, activeConversationId, router]);

  useEffect(() => {
    let hiddenAt: number | null = null;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }

      if (
        document.visibilityState === "visible" &&
        hiddenAt !== null &&
        Date.now() - hiddenAt >= 60_000
      ) {
        void globalUnread?.refresh();
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [globalUnread, router]);

  const filtered = useMemo(
    () => filterInboxItems(conversations, search),
    [conversations, search]
  );

  const inboxContextValue = useMemo(
    () => ({ patchInboxUnread }),
    [patchInboxUnread]
  );

  const showInboxChrome = !activeConversationId;

  return (
    <InboxPatchContext.Provider value={inboxContextValue}>
      <div
        className={`lg:grid lg:grid-cols-[minmax(300px,380px)_1fr] lg:gap-5 lg:items-stretch ${
          activeConversationId ? "flex h-full min-h-0 flex-1 flex-col" : ""
        }`}
      >
        <aside
          className={`flex flex-col gap-3 ${
            activeConversationId ? "hidden lg:flex lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]" : ""
          }`}
        >
          {showInboxChrome ? (
            <>
              <div className="flex items-center justify-between gap-2 px-0.5">
                <h1 className="text-xl font-black tracking-tight text-white">Tin nhắn</h1>
                <Link
                  aria-label="Cài đặt tin nhắn"
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-cyan-200"
                  href="/me/settings/messages"
                >
                  <SettingsIcon />
                </Link>
              </div>

              {!requestsTab ? <InboxSearch onChange={setSearch} value={search} /> : null}

              <div
                className="flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1"
                role="tablist"
              >
                <TabLink
                  active={!requestsTab}
                  badge={inboxTabBadge}
                  href="/messages"
                  label="Tin nhắn"
                />
                <TabLink
                  active={requestsTab}
                  badge={requestsTabBadge}
                  href="/messages?tab=requests"
                  label="Yêu cầu"
                />
              </div>
            </>
          ) : null}

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
              showInboxChrome ? "lg:max-h-[calc(100dvh-14rem)]" : ""
            }`}
          >
            {requestsTab ? (
              <MessageRequestList requests={requests} />
            ) : (
              <InboxList activeConversationId={activeConversationId} items={filtered} />
            )}
          </div>
        </aside>

        <section
          className={`flex min-h-0 flex-col overflow-hidden bg-[#0a0e14]/90 lg:rounded-2xl lg:border lg:border-white/10 ${
            activeConversationId
              ? "h-full min-h-0 flex-1"
              : "hidden lg:flex lg:min-h-[calc(100dvh-12rem)]"
          }`}
        >
          {activeConversationId ? (
            children
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
              <p className="text-sm font-medium text-zinc-300">Chọn cuộc trò chuyện</p>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-600">
                Mở hồ sơ người dùng và bấm Nhắn tin để bắt đầu.
              </p>
            </div>
          )}
        </section>

        {children && !activeConversationId ? (
          <div className="lg:hidden">{children}</div>
        ) : null}
      </div>
    </InboxPatchContext.Provider>
  );
}

function TabLink({
  href,
  label,
  active,
  badge
}: {
  href: string;
  label: string;
  active: boolean;
  badge: number;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition ${
        active
          ? "bg-cyan-400/12 text-cyan-100"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
      href={href}
      role="tab"
    >
      <span>{label}</span>
      {badge > 0 ? (
        <span
          aria-label={`${badge} chưa đọc`}
          className="inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-black tabular-nums text-zinc-950"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 12h1.1M18.4 12H19.5M12 4.5v1.1M12 18.4V19.5M7.05 7.05l.78.78M16.17 16.17l.78.78M16.95 7.05l-.78.78M7.83 16.17l-.78.78"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
