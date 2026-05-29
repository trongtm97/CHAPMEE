"use client";

import type { ReactNode } from "react";
import { useCoinBalance } from "@/hooks/useCoinBalance";

type MeProfileCoinBalanceProps = {
  showCoinWallet: boolean;
  children: (coinBalance: number | null) => ReactNode;
};

/** Coin balance from client cache — avoids blocking /me on wallet queries. */
export function MeProfileCoinBalance({ children, showCoinWallet }: MeProfileCoinBalanceProps) {
  const { balance, isLoggedIn, loading } = useCoinBalance();

  if (!showCoinWallet) {
    return <>{children(null)}</>;
  }

  if (loading) {
    return <>{children(null)}</>;
  }

  return <>{children(isLoggedIn ? balance : null)}</>;
}
