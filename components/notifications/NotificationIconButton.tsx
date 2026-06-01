"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";

type NotificationIconButtonProps = {
  size?: "sm" | "md";
};

function formatBadgeCount(count: number) {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export function NotificationIconButton({ size = "sm" }: NotificationIconButtonProps) {
  const router = useRouter();
  const { loading, unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;
  const iconSize = size === "md" ? "size-6" : "size-5";

  return (
    <button
      aria-label={
        hasUnread
          ? `Mở thông báo, ${unreadCount} chưa đọc`
          : "Mở thông báo"
      }
      className="tap-highlight relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
      onClick={() => router.push("/notifications")}
      type="button"
    >
      <BellSolidIcon className={iconSize} />
      {!loading && hasUnread ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0b1016]">
          {formatBadgeCount(unreadCount)}
        </span>
      ) : null}
    </button>
  );
}

function BellSolidIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M12 2.75a5.25 5.25 0 0 0-5.25 5.25v3.1l-.98 1.63a1.25 1.25 0 0 0 1.07 1.9h10.32a1.25 1.25 0 0 0 1.07-1.9l-.98-1.63v-3.1A5.25 5.25 0 0 0 12 2.75Zm-1.5 14.5h3a1.5 1.5 0 0 1-3 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
