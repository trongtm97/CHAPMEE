"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "@/components/messages/MessageBubble";
import { dayKey, formatDateDivider } from "@/lib/messages/format-message-time";
import { getMessageGroupMeta } from "@/lib/messages/group-message-bubbles";
import type { ConversationMessage } from "@/types/messages";

type MessageListProps = {
  messages: ConversationMessage[];
  conversationId: string;
  otherUserId: string;
  otherLastReadAt: string | null;
  onRetryFailed?: (body: string, tempId: string) => void;
};

export function MessageList({
  messages,
  conversationId,
  otherUserId,
  otherLastReadAt,
  onRetryFailed
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickRef = useRef(true);
  const prevCountRef = useRef(messages.length);

  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.isOwn && m.displayState === "normal" && m.deliveryStatus !== "failed") {
        return m.id;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      shouldStickRef.current = distance < 120;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const isNewMessage = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;

    if (!shouldStickRef.current && !isNewMessage) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: isNewMessage ? "smooth" : "auto" });
  }, [messages, conversationId]);

  if (!messages.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-300">Hãy bắt đầu cuộc trò chuyện.</p>
        <p className="mt-1.5 text-xs text-zinc-600">Gửi lời chào để bắt đầu trò chuyện.</p>
      </div>
    );
  }

  let lastDay = "";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-2 sm:px-4"
      ref={scrollRef}
    >
      {messages.map((message, index) => {
        const dk = dayKey(message.createdAt);
        const showDivider = dk !== lastDay;
        lastDay = dk;

        const group = getMessageGroupMeta(messages, index);

        const showSeen =
          message.id === lastOwnMessageId &&
          message.isOwn &&
          otherLastReadAt != null &&
          new Date(otherLastReadAt).getTime() >= new Date(message.createdAt).getTime();

        return (
          <div key={message.clientId ?? message.id}>
            {showDivider ? (
              <p className="my-4 text-center text-[11px] font-medium text-zinc-500">
                {formatDateDivider(message.createdAt)}
              </p>
            ) : null}
            <MessageBubble
              conversationId={conversationId}
              group={group}
              message={message}
              onRetryFailed={
                message.deliveryStatus === "failed" && onRetryFailed
                  ? () => onRetryFailed(message.body, message.id)
                  : undefined
              }
              otherUserId={otherUserId}
              showSeen={showSeen}
            />
          </div>
        );
      })}
      <div ref={bottomRef} className="h-2 shrink-0" aria-hidden="true" />
    </div>
  );
}
