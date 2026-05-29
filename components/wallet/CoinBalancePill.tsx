"use client";

import { useRouter } from "next/navigation";
import { formatCompactCoin } from "@/lib/format/format-compact-coin";

type CoinBalancePillProps = {
  balance: number;
  href?: string;
  isLoggedIn: boolean;
  loading?: boolean;
};

export function CoinBalancePill({
  balance,
  href = "/wallet",
  isLoggedIn,
  loading = false
}: CoinBalancePillProps) {
  const router = useRouter();
  const targetHref = isLoggedIn ? href : `/login?next=${encodeURIComponent(href)}`;
  const label = isLoggedIn ? formatCompactCoin(balance) : "Coin";

  return (
    <button
      aria-label={isLoggedIn ? `Ví coin: ${label}` : "Đăng nhập để xem ví coin"}
      className="tap-highlight relative z-10 inline-flex min-h-10 shrink-0 items-center gap-1 px-1 text-xs font-semibold text-zinc-100 transition active:text-amber-200"
      onClick={() => router.push(targetHref)}
      type="button"
    >
      <span aria-hidden="true" className="text-[0.95rem] leading-none">
        🪙
      </span>
      <span className="tabular-nums">{loading && isLoggedIn ? "…" : label}</span>
    </button>
  );
}
