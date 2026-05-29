"use client";

import { useRouter } from "next/navigation";
import { UnreadBadge } from "@/components/messages/UnreadBadge";
import { useMessageUnread } from "@/components/messages/message-unread-context";

export function MessageIconButton() {
  const router = useRouter();
  const unread = useMessageUnread();
  const messageUnread = unread?.messageUnread ?? 0;

  return (
    <button
      aria-label={
        messageUnread > 0 ? `Tin nhắn, ${messageUnread} chưa đọc` : "Tin nhắn"
      }
      className="tap-highlight relative z-10 inline-flex min-h-10 shrink-0 items-center gap-1.5 px-1 text-zinc-100"
      onClick={() => router.push("/messages")}
      type="button"
    >
      <span className="relative inline-flex">
        <ChatIcon className="size-5" />
        {messageUnread > 0 ? (
          <UnreadBadge className="absolute -right-2 -top-1.5 min-h-4 min-w-4 px-0.5 text-[9px]" count={messageUnread} />
        ) : null}
      </span>
    </button>
  );
}

function ChatIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
