"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/brand/storage";
import { readSessionCache, writeSessionCache } from "@/lib/client/session-cache";
import { createClient } from "@/lib/supabase/client";
import { getTotalSpendableCoinBalance } from "@/lib/wallet/get-coin-balance";

const COIN_CACHE_KEY = STORAGE_KEYS.coinBalance;
const COIN_CACHE_KEY_LEGACY = "chapchap:coin-balance";
const COIN_CACHE_TTL_MS = 45_000;

type CoinCacheValue = {
  balance: number;
  isLoggedIn: boolean;
};

type UseCoinBalanceState = CoinCacheValue & {
  loading: boolean;
};

function readCoinCache(): CoinCacheValue | null {
  return readSessionCache<CoinCacheValue>(
    COIN_CACHE_KEY,
    COIN_CACHE_TTL_MS,
    COIN_CACHE_KEY_LEGACY
  );
}

const INITIAL_COIN_STATE: UseCoinBalanceState = {
  balance: 0,
  isLoggedIn: false,
  loading: true
};

export function useCoinBalance() {
  const [state, setState] = useState<UseCoinBalanceState>(INITIAL_COIN_STATE);

  useEffect(() => {
    let isCancelled = false;

    const cached = readCoinCache();
    if (cached) {
      setState({ ...cached, loading: false });
    }

    async function loadBalance() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          if (!isCancelled) {
            const next = { balance: 0, isLoggedIn: false, loading: false };
            writeSessionCache(
              COIN_CACHE_KEY,
              {
                balance: next.balance,
                isLoggedIn: next.isLoggedIn
              },
              COIN_CACHE_KEY_LEGACY
            );
            setState(next);
          }
          return;
        }

        const { data, error } = await supabase
          .from("user_wallets")
          .select("paid_coin_balance, bonus_coin_balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        const balance = data
          ? getTotalSpendableCoinBalance({
              paid_coin_balance: Number(data.paid_coin_balance ?? 0),
              bonus_coin_balance: Number(data.bonus_coin_balance ?? 0)
            })
          : 0;

        if (!isCancelled) {
          const next = { balance, isLoggedIn: true, loading: false };
          writeSessionCache(
            COIN_CACHE_KEY,
            {
              balance: next.balance,
              isLoggedIn: next.isLoggedIn
            },
            COIN_CACHE_KEY_LEGACY
          );
          setState(next);
        }
      } catch {
        if (!isCancelled) {
          setState({ balance: 0, isLoggedIn: false, loading: false });
        }
      }
    }

    void loadBalance();
    const intervalId = window.setInterval(() => {
      void loadBalance();
    }, 30_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}
