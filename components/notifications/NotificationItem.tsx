"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatRelativeTime } from "@/lib/notifications/format-relative-time";
import { getNotificationActionUrl } from "@/lib/notifications/get-notification-action-url";
import { getNotificationCategory } from "@/lib/notifications/notification-categories";
import { isMessageNotificationType } from "@/lib/notifications/message-notification-types";
import { isMockNotificationId } from "@/lib/notifications/mock-notifications";
import type { NotificationItem as NotificationItemType } from "@/types/notification";

type NotificationItemProps = {
  item: NotificationItemType;
  onRead: (id: string) => void;
};

export function NotificationItem({ item, onRead }: NotificationItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isUnread = !item.read_at;
  const category = getNotificationCategory(item.type);
  const contextLabel = getContextLabel(item);
  const thumbnail = item.metadata?.thumbnail_url;

  function handleClick() {
    const targetUrl = getNotificationActionUrl(item);
    startTransition(() => {
      onRead(item.id);
      router.push(
        isMockNotificationId(item.id)
          ? targetUrl
          : `/notifications/open?id=${encodeURIComponent(item.id)}&next=${encodeURIComponent(targetUrl)}`
      );
    });
  }

  return (
    <button
      className={`tap-highlight flex w-full gap-3 px-3 py-3 text-left transition hover:bg-white/[0.03] disabled:opacity-70 ${
        isUnread ? "bg-cyan-300/[0.04]" : ""
      }`}
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      <div className="relative shrink-0">
        <NotificationTypeIcon
          category={category}
          isMessage={isMessageNotificationType(item.type)}
        />
        {isUnread ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 top-0 size-2 rounded-full bg-cyan-300 ring-2 ring-[#0b1016]"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="line-clamp-1 flex-1 text-sm font-semibold text-white">{item.title}</p>
          {thumbnail ? (
            <Image
              alt=""
              className="size-9 shrink-0 rounded-md object-cover"
              height={36}
              src={thumbnail}
              width={36}
            />
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-400">{item.body}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {contextLabel ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {contextLabel}
            </span>
          ) : null}
          <span className="text-[11px] text-zinc-500">{formatRelativeTime(item.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

function getContextLabel(item: NotificationItemType) {
  const meta = item.metadata;
  if (!meta) return null;
  if (typeof meta.context_label === "string") return meta.context_label;
  if (typeof meta.story_title === "string") return meta.story_title;
  if (typeof meta.group_name === "string") return meta.group_name;
  if (typeof meta.coin_amount === "number") return `${meta.coin_amount} coin`;
  return null;
}

function NotificationTypeIcon({
  category,
  isMessage
}: {
  category: ReturnType<typeof getNotificationCategory>;
  isMessage: boolean;
}) {
  if (isMessage) {
    return (
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-cyan-400/12 text-cyan-200">
        <MessageChatIcon />
      </span>
    );
  }

  const icon = categoryIcons[category];
  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-full text-base ${icon.className}`}
    >
      {icon.emoji}
    </span>
  );
}

function MessageChatIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const categoryIcons = {
  reading: { emoji: "📖", className: "bg-sky-400/10 text-sky-200" },
  author: { emoji: "✍️", className: "bg-violet-400/10 text-violet-200" },
  community: { emoji: "💬", className: "bg-fuchsia-400/10 text-fuchsia-200" },
  wallet: { emoji: "🪙", className: "bg-amber-400/10 text-amber-200" },
  creator: { emoji: "📊", className: "bg-emerald-400/10 text-emerald-200" },
  messages: { emoji: "💬", className: "bg-cyan-400/12 text-cyan-200" },
  system: { emoji: "🔔", className: "bg-zinc-400/10 text-zinc-300" }
} as const;
