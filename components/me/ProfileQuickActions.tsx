"use client";

import Link from "next/link";
import { buildMeQuickActionHref } from "@/lib/me/profileQuickActions";

type ProfileQuickActionsProps = {
  readingCount: number;
  savedCount: number;
  collectionsCount: number;
  groupsCount: number;
  coinBalance?: number | null;
  isCreator: boolean;
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

  const className = `tap-highlight flex min-h-[4.25rem] flex-col items-center justify-center rounded-[0.9rem] px-1 py-1.5 transition ${
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
            {action.badge}
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
  coinBalance,
  collectionsCount,
  groupsCount,
  isCreator,
  readingCount,
  savedCount,
  showCoinWallet = true
}: ProfileQuickActionsProps) {
  const quickActionOptions = { isCreator, showCoinWallet };

  const actions: QuickAction[] = [
    {
      id: "continue",
      label: "Đọc tiếp",
      href: buildMeQuickActionHref("continue", quickActionOptions),
      badge: readingCount,
      showZeroBadge: true,
      emphasize: true,
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
      showZeroBadge: true,
      icon: <BookmarkIcon />
    },
    {
      id: "groups",
      label: "Nhóm theo dõi",
      href: buildMeQuickActionHref("groups", quickActionOptions),
      badge: groupsCount,
      icon: <UsersIcon />
    },
    ...(showCoinWallet
      ? [
          {
            id: "wallet",
            label: "Ví coin",
            href: buildMeQuickActionHref("wallet", quickActionOptions),
            badge: coinBalance,
            icon: <CoinIcon />
          } satisfies QuickAction
        ]
      : []),
    {
      id: "studio",
      label: isCreator ? "Studio" : "Bắt đầu viết",
      href: buildMeQuickActionHref("studio", quickActionOptions),
      emphasize: true,
      icon: <PenIcon />
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
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

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm11 1a2.5 2.5 0 1 0-2.5-2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M3.5 19a4.5 4.5 0 0 1 9 0M14 19a3.5 3.5 0 0 1 7 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8.5v7M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
