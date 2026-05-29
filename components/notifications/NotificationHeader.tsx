"use client";

import Link from "next/link";
import { MobileBackHeader } from "@/components/me/MobileBackHeader";

type NotificationHeaderProps = {
  unreadCount: number;
};

export function NotificationHeader({ unreadCount }: NotificationHeaderProps) {
  return (
    <>
      <MobileBackHeader
        fallbackHref="/me"
        rightAction={<NotificationSettingsButton />}
        title="Thông báo"
        variant="compact"
      />

      <div className="hidden lg:block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">Thông báo</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cập nhật mới từ truyện, tác giả và tài khoản của bạn.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Bạn đã xem hết thông báo mới"}
            </p>
          </div>
          <NotificationSettingsButton />
        </div>
      </div>

      <p className="text-sm leading-6 text-zinc-400 lg:hidden">
        Cập nhật mới từ truyện, tác giả và tài khoản của bạn.
      </p>
    </>
  );
}

function NotificationSettingsButton() {
  return (
    <Link
      aria-label="Cài đặt thông báo"
      className="tap-highlight inline-flex min-h-10 min-w-10 items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/6 hover:text-white"
      href="/notifications/settings"
    >
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5ZM19.4 12a7.36 7.36 0 0 0 .1-1 7.36 7.36 0 0 0-.1-1l2-1.55a.75.75 0 0 0 .18-.97l-1.9-3.29a.75.75 0 0 0-.9-.33l-2.3.95a7.1 7.1 0 0 0-1.73-1l-.35-2.45A.75.75 0 0 0 14.25 1h-3.5a.75.75 0 0 0-.74.64l-.35 2.45a7.1 7.1 0 0 0-1.73 1l-2.3-.95a.75.75 0 0 0-.9.33L2.43 7.48a.75.75 0 0 0 .18.97L4.6 12a7.36 7.36 0 0 0-.1 1 7.36 7.36 0 0 0 .1 1l-2 1.55a.75.75 0 0 0-.18.97l1.9 3.29a.75.75 0 0 0 .9.33l2.3-.95a7.1 7.1 0 0 0 1.73 1l.35 2.45a.75.75 0 0 0 .74.64h3.5a.75.75 0 0 0 .74-.64l.35-2.45a7.1 7.1 0 0 0 1.73-1l2.3.95a.75.75 0 0 0 .9-.33l1.9-3.29a.75.75 0 0 0-.18-.97L19.4 12Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </Link>
  );
}
