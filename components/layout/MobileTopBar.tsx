"use client";

import Link from "next/link";
import { ChapMeeLogo } from "@/components/brand/ChapMeeLogo";
import { CoinBalancePill } from "@/components/wallet/CoinBalancePill";
import { NotificationIconButton } from "@/components/notifications/NotificationIconButton";
import { MessageIconButton } from "@/components/messages/MessageIconButton";
import { StreakPill } from "@/components/missions/StreakPill";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useMobileTopBarConfig } from "@/hooks/useMobileTopBarConfig";

type MobileTopBarVariant = "default" | "compact";

type MobileTopBarProps = {
  variant?: MobileTopBarVariant;
};

export function MobileTopBar({ variant = "default" }: MobileTopBarProps) {
  const { enableCoinWallet, streakDays } = useMobileTopBarConfig();
  const { balance, isLoggedIn, loading } = useCoinBalance();
  const isCompact = variant === "compact";
  const logoHeight = isCompact ? 28 : 32;

  return (
    <header
      className={`sticky top-0 z-40 isolate flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0b1016]/88 px-4 backdrop-blur-2xl md:px-6 lg:hidden ${
        isCompact
          ? "pb-2 pt-[calc(env(safe-area-inset-top)+0.55rem)]"
          : "pb-2.5 pt-[calc(env(safe-area-inset-top)+0.65rem)]"
      }`}
    >
      <Link className="tap-highlight shrink-0" href="/discover">
        <ChapMeeLogo height={logoHeight} priority />
      </Link>

      <div className="relative z-10 flex min-w-0 items-center justify-end gap-2 pointer-events-auto">
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
