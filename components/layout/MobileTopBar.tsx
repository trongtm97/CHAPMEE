"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { MobileTopBarSearch } from "@/components/layout/MobileTopBarSearch";
import { CoinBalancePill } from "@/components/wallet/CoinBalancePill";
import { NotificationIconButton } from "@/components/notifications/NotificationIconButton";
import { MessageIconButton } from "@/components/messages/MessageIconButton";
import { UtilitiesMobileHeaderMenu } from "@/components/utilities/UtilitiesSidebar";
import { ContentPostsMobileMenuButton } from "@/components/content-posts/ContentPostsMobileMenuButton";
import { StreakPill } from "@/components/missions/StreakPill";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useMobileTopBarConfig } from "@/hooks/useMobileTopBarConfig";

/** Chiều cao logo mobile — dùng thống nhất mọi trang (tránh lúc to lúc nhỏ). */
const MOBILE_TOP_BAR_LOGO_HEIGHT = 28;

export function MobileTopBar() {
  const pathname = usePathname();
  const isReelsRoute = pathname === "/" || pathname.startsWith("/reels");
  const isUtilitiesRoute = pathname.startsWith("/tien-ich");
  const isContentPostsRoute = pathname.startsWith("/bai-viet");
  const { enableCoinWallet, streakDays } = useMobileTopBarConfig();
  const { balance, isLoggedIn, loading } = useCoinBalance();

  return (
    <header
      className={`sticky top-0 z-40 isolate flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0b1016]/88 px-3 backdrop-blur-2xl md:px-5 lg:hidden ${
        isReelsRoute
          ? "min-h-[3.15rem] pb-1.5 pt-[calc(env(safe-area-inset-top)+0.4rem)]"
          : "min-h-[3.5rem] pb-2 pt-[calc(env(safe-area-inset-top)+0.55rem)]"
      }`}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        {isUtilitiesRoute ? <UtilitiesMobileHeaderMenu /> : null}
        {isContentPostsRoute ? <ContentPostsMobileMenuButton /> : null}
        <Link className="tap-highlight min-w-0 shrink-0" href="/">
          <ChapMeeLogo height={MOBILE_TOP_BAR_LOGO_HEIGHT} priority />
        </Link>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <MobileTopBarSearch />
        {streakDays ? <StreakPill days={streakDays} /> : null}
        {enableCoinWallet ? (
          <CoinBalancePill balance={balance} isLoggedIn={isLoggedIn} loading={loading} />
        ) : null}
        <MessageIconButton />
        <NotificationIconButton />
      </div>
    </header>
  );
}
