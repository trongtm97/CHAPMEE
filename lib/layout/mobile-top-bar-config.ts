import type { MonetizationSettingsMap } from "@/types/monetization";

export type MobileTopBarConfig = {
  enableCoinWallet: boolean;
  streakDays: number | null;
};

export function resolveMobileTopBarConfig(
  settings: MonetizationSettingsMap | Record<string, unknown>
): MobileTopBarConfig {
  const flags = settings as Record<string, unknown>;
  const enableCoinWallet =
    typeof flags.enable_coin_wallet === "boolean" ? flags.enable_coin_wallet : true;

  const streakRaw = flags["reading.streak_days"];
  const streakDays =
    typeof streakRaw === "number" && streakRaw > 0 ? Math.floor(streakRaw) : null;

  return {
    enableCoinWallet,
    streakDays
  };
}
