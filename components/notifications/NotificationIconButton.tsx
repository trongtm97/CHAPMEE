"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";

type NotificationIconButtonProps = {
  size?: "sm" | "md";
};

export function NotificationIconButton({ size = "sm" }: NotificationIconButtonProps) {
  const router = useRouter();
  const { loading, unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;
  const iconSize = size === "md" ? "size-[1.15rem]" : "size-5";

  return (
    <button
      aria-label={
        hasUnread
          ? `Mở thông báo, ${unreadCount} chưa đọc`
          : "Mở thông báo"
      }
      className="tap-highlight relative z-10 inline-flex min-h-10 shrink-0 items-center gap-1.5 px-1 text-zinc-100 transition active:text-zinc-300"
      onClick={() => router.push("/notifications")}
      type="button"
    >
      <BellIcon className={iconSize} />
      {!loading && hasUnread ? (
        <span className="min-w-[0.85rem] text-right text-[11px] font-bold leading-none text-red-500 tabular-nums">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}

function BellIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M6 10.5a6 6 0 1 1 12 0v4l1.5 2.5H4.5L6 14.5v-4Zm4 8a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
