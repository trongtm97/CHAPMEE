"use client";

import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { HotBadge } from "@/components/common/HotBadge";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageIconButton } from "@/components/messages/MessageIconButton";
import { HeaderSearchButton } from "@/components/navigation/HeaderSearchButton";
import { ProfileNavIcon } from "@/components/navigation/AppNavIcons";
import {
  DESKTOP_HEADER_NAV,
  isNavActive,
  type HeaderNavEmphasis,
  type NavItemConfig
} from "@/lib/navigation/nav-items";
import { NotificationIconButton } from "@/components/notifications/NotificationIconButton";
import { CoinBalancePill } from "@/components/wallet/CoinBalancePill";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useMobileTopBarConfig } from "@/hooks/useMobileTopBarConfig";

const navLinkBase =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent px-2 text-[0.75rem] font-semibold leading-none transition xl:px-2.5 xl:text-[0.8125rem]";

function getNavLinkClass(active: boolean, emphasis?: HeaderNavEmphasis) {
  if (emphasis === "hot") {
    return active
      ? `${navLinkBase} border-amber-300/55 bg-gradient-to-br from-amber-400/30 via-orange-500/22 to-rose-500/18 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.18)]`
      : `${navLinkBase} border-amber-400/35 bg-gradient-to-br from-amber-500/22 via-orange-500/14 to-rose-500/8 text-amber-100 hover:border-amber-300/50 hover:from-amber-500/28 hover:text-amber-50`;
  }
  if (emphasis === "featured") {
    return active
      ? `${navLinkBase} border-violet-300/45 bg-violet-500/28 text-violet-50 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.15)]`
      : `${navLinkBase} border-violet-400/30 bg-violet-500/16 text-violet-100 hover:border-violet-300/40 hover:bg-violet-500/22 hover:text-violet-50`;
  }
  if (emphasis === "honor") {
    return active
      ? `${navLinkBase} border-yellow-300/55 bg-gradient-to-br from-yellow-400/28 via-amber-500/20 to-yellow-600/14 text-yellow-50 shadow-[0_0_14px_rgba(234,179,8,0.2)]`
      : `${navLinkBase} border-yellow-400/40 bg-gradient-to-br from-yellow-500/20 via-amber-500/12 to-yellow-600/8 text-yellow-100 hover:border-yellow-300/55 hover:from-yellow-500/26 hover:text-yellow-50`;
  }
  return active
    ? `${navLinkBase} bg-cyan-300/12 text-cyan-100`
    : `${navLinkBase} text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100`;
}

function HeaderNavItem({
  link,
  active
}: {
  link: NavItemConfig;
  active: boolean;
}) {
  const Icon = link.icon;
  const className = getNavLinkClass(active, link.headerEmphasis);

  if (link.headerEmphasis === "hot") {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={className}
        href={link.href}
        title={link.label}
      >
        {Icon ? <Icon active={active} className="size-4 shrink-0" /> : null}
        <span className="inline-flex items-center gap-1.5">
          {link.label}
          <HotBadge />
        </span>
      </Link>
    );
  }

  return (
    <Link aria-current={active ? "page" : undefined} className={className} href={link.href} title={link.label}>
      {Icon ? <Icon active={active} className="size-4 shrink-0" /> : null}
      <span>{link.label}</span>
    </Link>
  );
}

type DesktopHeaderProps = {
  compact?: boolean;
};

export function DesktopHeader({ compact = false }: DesktopHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { enableCoinWallet } = useMobileTopBarConfig();
  const { balance, isLoggedIn, loading } = useCoinBalance();

  return (
    <header
      className={`sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b1016]/90 backdrop-blur-xl lg:block ${
        compact ? "reader-desktop-header" : ""
      }`}
    >
      <div className="mx-auto flex h-12 w-full max-w-screen-2xl items-center gap-2 px-3 xl:gap-3 xl:px-6 2xl:px-8">
        <Link className="flex shrink-0 items-center" href="/">
          <ChapMeeLogo height={28} priority />
        </Link>

        <nav className="no-scrollbar flex min-w-0 flex-1 items-center justify-center gap-px overflow-x-auto overflow-y-visible py-1 2xl:gap-0.5">
          {DESKTOP_HEADER_NAV.map((link) => (
            <HeaderNavItem active={isNavActive(pathname, link.href, tab)} key={link.href} link={link} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5">
          <HeaderSearchButton />
          <MessageIconButton />
          <NotificationIconButton size="md" />
          {enableCoinWallet ? (
            <CoinBalancePill balance={balance} isLoggedIn={isLoggedIn} loading={loading} />
          ) : null}
          {isLoggedIn ? (
            <Link
              className="ml-0.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-300 px-2.5 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200 xl:px-3"
              href="/me"
              title="Hồ sơ"
            >
              <ProfileNavIcon className="size-4 shrink-0" />
              <span>Hồ sơ</span>
            </Link>
          ) : loading ? null : (
            <>
              <Link
                className="ml-0.5 inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.04] hover:text-zinc-100 xl:px-3"
                href="/login"
                title="Đăng nhập"
              >
                Đăng nhập
              </Link>
              <Link
                className="inline-flex h-8 shrink-0 items-center rounded-lg bg-cyan-300 px-2.5 text-xs font-bold text-zinc-950 transition hover:bg-cyan-200 xl:px-3"
                href="/register"
                title="Đăng ký"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
