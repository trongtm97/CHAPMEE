"use client";

import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { usePathname } from "next/navigation";
import { MessageNavLink } from "@/components/messages/MessageNavLink";
import {
  ArticleNavIcon,
  CommunityNavIcon,
  DiscoverNavIcon,
  ProfileNavIcon,
  ReelsNavIcon,
  StudioNavIcon,
  WalletNavIcon
} from "@/components/navigation/AppNavIcons";
import { NotificationIconButton } from "@/components/notifications/NotificationIconButton";
import type { ReactNode } from "react";

const primaryLinks = [
  { href: "/reels", label: "Reels", icon: ReelsNavIcon },
  { href: "/discover", label: "Khám phá", icon: DiscoverNavIcon },
  { href: "/community", label: "Cộng đồng", icon: CommunityNavIcon },
  { href: "/bai-viet", label: "Bài viết", icon: ArticleNavIcon }
] as const;

const utilityLinks: ReadonlyArray<{
  href: string;
  label: string;
  emphasized?: boolean;
  icon?: (props: { className?: string; active?: boolean }) => ReactNode;
}> = [
  { href: "/studio/stories/new", label: "Viết truyện", emphasized: true, icon: StudioNavIcon },
  { href: "/studio", label: "Studio", icon: StudioNavIcon },
  { href: "/wallet", label: "Ví/Coin", icon: WalletNavIcon },
  { href: "/me", label: "Hồ sơ", icon: ProfileNavIcon }
];

function isActive(pathname: string, href: string) {
  if (href === "/reels") {
    return pathname === "/" || pathname.startsWith("/reels");
  }
  return pathname.startsWith(href);
}

/** Shared pill height — prevents multi-line labels from breaking vertical alignment. */
const navPillClass =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold leading-none transition";

export function DesktopHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b1016]/85 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between gap-3 px-4 xl:gap-6 xl:px-8">
        <Link className="flex shrink-0 items-center gap-3" href="/">
          <ChapMeeLogo height={34} priority />
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 xl:gap-1">
          {primaryLinks.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                className={`${navPillClass} ${
                  active
                    ? "bg-cyan-300/15 text-cyan-200"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                } ${link.href === "/reels" ? "border border-cyan-300/20" : ""}`}
                href={link.href}
                key={link.href}
              >
                <Icon active={active} className="size-4 shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 xl:gap-1.5">
          <Link
            className={`${navPillClass} border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/20`}
            href="/discover"
          >
            <DiscoverNavIcon className="size-4 shrink-0" />
            Tìm kiếm
          </Link>
          <MessageNavLink />
          <NotificationIconButton size="md" />
          {utilityLinks.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            const className =
              link.emphasized === true
                ? `${navPillClass} bg-cyan-300 font-bold text-zinc-950 hover:bg-cyan-200`
                : `${navPillClass} border ${
                    active
                      ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                      : "border-white/10 text-zinc-200 hover:border-cyan-300/40 hover:text-cyan-100"
                  }`;

            return (
              <Link className={className} href={link.href} key={link.href}>
                {Icon ? <Icon active={active} className="size-4 shrink-0" /> : null}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
