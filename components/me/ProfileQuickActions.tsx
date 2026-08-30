"use client";

import Link from "next/link";
import { useMessageUnread } from "@/components/messages/message-unread-context";
import { buildMeQuickActionHref } from "@/lib/me/profileQuickActions";

type ProfileQuickActionsProps = {
  readingCount: number;
  savedCount: number;
  collectionsCount: number;
  isCreator: boolean;
  hasStories?: boolean;
  unreadMessagesCount?: number;
  showCoinWallet?: boolean;
};

type QuickAction = {
  id: string;
  label: string;
  href: string;
  badge?: number | null;
  showZeroBadge?: boolean;
  emphasize?: boolean;
  icon: React.ReactNode;
};

function ActionTile({ action }: { action: QuickAction }) {
  const showBadge =
    action.badge != null && (action.showZeroBadge || action.badge > 0);

  const className = `tap-highlight flex min-h-[4rem] flex-col items-center justify-center rounded-xl px-1 py-1.5 transition ${
    action.emphasize
      ? "border border-cyan-300/15 bg-cyan-300/[0.04] hover:border-cyan-300/25 hover:bg-cyan-300/[0.07]"
      : "border border-white/5 bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]"
  }`;

  return (
    <Link className={className} href={action.href}>
      <span
        className={`relative flex h-7 w-7 items-center justify-center rounded-lg text-cyan-200/90 ${
          action.emphasize
            ? "border border-cyan-300/20 bg-cyan-300/10"
            : "border border-white/5 bg-white/[0.03]"
        }`}
      >
        {action.icon}
        {showBadge ? (
          <span className="absolute -right-1.5 -top-1 inline-flex min-w-[0.95rem] items-center justify-center rounded-full bg-cyan-300 px-0.5 py-px text-[0.5rem] font-black leading-none text-zinc-950">
            {action.badge! > 99 ? "99+" : action.badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1 text-center text-[0.625rem] font-medium leading-tight text-zinc-300">
        {action.label}
      </span>
    </Link>
  );
}

export function ProfileQuickActions({
  collectionsCount,
  hasStories = false,
  isCreator,
  readingCount,
  savedCount,
  showCoinWallet = false,
  unreadMessagesCount
}: ProfileQuickActionsProps) {
  const quickActionOptions = { isCreator, showCoinWallet };
  const contextUnread = useMessageUnread()?.messageUnread ?? 0;
  const messageUnread = unreadMessagesCount ?? contextUnread;
  const studioLabel = isCreator || hasStories ? "Mở Studio" : "Bắt đầu viết";

  const actions: QuickAction[] = [
    {
      id: "continue",
      label: "Đọc tiếp",
      href: buildMeQuickActionHref("continue", quickActionOptions),
      badge: readingCount,
      showZeroBadge: false,
      emphasize: readingCount > 0,
      icon: <BookIcon />
    },
    {
      id: "collections",
      label: "Tủ truyện",
      href: buildMeQuickActionHref("collections", quickActionOptions),
      badge: collectionsCount,
      icon: <ShelfIcon />
    },
    {
      id: "saved",
      label: "Đã lưu",
      href: buildMeQuickActionHref("saved", quickActionOptions),
      badge: savedCount,
      showZeroBadge: false,
      icon: <BookmarkIcon />
    },
    {
      id: "messages",
      label: "Tin nhắn",
      href: "/messages",
      badge: messageUnread,
      emphasize: messageUnread > 0,
      icon: <MessageIcon />
    },
    {
      id: "studio",
      label: studioLabel,
      href: buildMeQuickActionHref("studio", quickActionOptions),
      emphasize: true,
      icon: <PenIcon />
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
      {actions.map((action) => (
        <ActionTile action={action} key={action.id} />
      ))}
    </div>
  );
}

function BookIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M5 6.5h12a1 1 0 0 1 1 1V18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M5 18.5h13a1 1 0 0 0 1-1v-11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M4 8h16M4 13h16M4 18h10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M7 5.5h10v14l-5-3-5 3v-14Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="m14 5 5 5-9 9H5v-5l9-9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-4 3v-3.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
