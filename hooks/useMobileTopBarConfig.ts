"use client";

import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/lib/brand/storage";
import { readSessionCache, writeSessionCache } from "@/lib/client/session-cache";
import type { MobileTopBarConfig } from "@/lib/layout/mobile-top-bar-config";

const TOP_BAR_CACHE_KEY = STORAGE_KEYS.mobileTopBar;
const TOP_BAR_CACHE_KEY_LEGACY = "chapchap:mobile-top-bar";
const TOP_BAR_CACHE_TTL_MS = 120_000;

const defaultConfig: MobileTopBarConfig = {
  enableCoinWallet: true,
  streakDays: null
};

export function useMobileTopBarConfig() {
  const [config, setConfig] = useState<MobileTopBarConfig>(defaultConfig);

  useEffect(() => {
    let isCancelled = false;

    const cached = readSessionCache<MobileTopBarConfig>(
      TOP_BAR_CACHE_KEY,
      TOP_BAR_CACHE_TTL_MS,
      TOP_BAR_CACHE_KEY_LEGACY
    );
    if (cached) {
      setConfig(cached);
    }

    async function loadConfig() {
      try {
        const response = await fetch("/api/mobile-top-bar", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as MobileTopBarConfig;
        if (!isCancelled) {
          const next = {
            enableCoinWallet: payload.enableCoinWallet ?? true,
            streakDays:
              typeof payload.streakDays === "number" && payload.streakDays > 0
                ? payload.streakDays
                : null
          } satisfies MobileTopBarConfig;
          writeSessionCache(TOP_BAR_CACHE_KEY, next, TOP_BAR_CACHE_KEY_LEGACY);
          setConfig(next);
        }
      } catch {
        if (!isCancelled) {
          setConfig(defaultConfig);
        }
      }
    }

    void loadConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  return config;
}
