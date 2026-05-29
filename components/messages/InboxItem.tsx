import Link from "next/link";
import { AvatarFallback } from "@/components/ui";
import { formatInboxTime } from "@/lib/messages/format-message-time";
import type { InboxConversationItem } from "@/types/messages";

type InboxItemProps = {
  item: InboxConversationItem;
  active?: boolean;
};

export function InboxItem({ item, active = false }: InboxItemProps) {
  const hasUnread = item.unreadCount > 0;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`tap-highlight flex items-center gap-3 px-3 py-3.5 transition active:bg-white/[0.06] ${
        active ? "bg-cyan-400/10" : "hover:bg-white/[0.03]"
      }`}
      href={`/messages/${item.id}`}
    >
      <div className="relative shrink-0">
        <AvatarFallback
          className="!size-12"
          name={item.otherUser.displayName}
          size="sm"
          src={item.otherUser.avatarUrl}
        />
        {hasUnread ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-cyan-300 ring-2 ring-[#0b1016]"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`line-clamp-1 min-w-0 flex-1 text-[0.9375rem] leading-snug ${
              hasUnread ? "font-bold text-white" : "font-semibold text-zinc-100"
            }`}
          >
            {item.otherUser.displayName}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
            {formatInboxTime(item.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {item.isMuted ? (
            <span
              aria-label="Đã tắt thông báo"
              className="inline-flex shrink-0 text-zinc-500"
              title="Đã tắt thông báo"
            >
              <MutedIcon />
            </span>
          ) : null}
          <p
            className={`line-clamp-1 min-w-0 flex-1 text-xs leading-relaxed ${
              hasUnread ? "font-medium text-zinc-300" : "text-zinc-500"
            }`}
          >
            {item.lastMessagePreview ?? "Bắt đầu trò chuyện"}
          </p>
        </div>
      </div>
      {hasUnread ? (
        <span
          aria-label={`${item.unreadCount} tin chưa đọc`}
          className="inline-flex min-h-[1.375rem] min-w-[1.375rem] shrink-0 items-center justify-center rounded-full bg-cyan-300 px-1.5 text-[11px] font-black tabular-nums text-zinc-950"
        >
          {item.unreadCount > 99 ? "99+" : item.unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function MutedIcon() {
  return (
    <svg aria-hidden className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M5.5 9.5a6.5 6.5 0 0113 0v4l1.5 2.5H4l1.5-2.5v-4z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M4 4l16 16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}
