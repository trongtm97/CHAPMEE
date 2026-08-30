import type { CurrentUserProfile } from "@/lib/auth/getCurrentUser";
import { getMonetizationConfig, isMoneyModuleEnabledForUsers } from "@/lib/monetization/config";
import { getOrCreateUserWallet } from "@/lib/wallets/user-wallet";
import { getTransactionsForUser } from "@/lib/data/transactions";
import { listChapterUnlocksByUser } from "@/lib/data/chapter-unlocks";
import { getUserVipStatus, isVipModuleEnabled } from "@/lib/monetization/vip";
import { getRewardedAdsAvailability } from "@/lib/monetization/rewarded-ads";
import { getPurchaseUiPolicyForRequest } from "@/lib/payments/purchase-mode";
import type { MePageData } from "@/types/me-page";

type LoadMeMonetizationParams = {
  userId: string;
  role?: CurrentUserProfile["role"] | null;
};

export async function loadMeMonetization({
  role,
  userId
}: LoadMeMonetizationParams): Promise<MePageData["monetization"]> {
  const [monetizationConfig, showCoinWallet, vipEnabled, vipStatus, rewardedAdsAvailability, purchasePolicy] =
    await Promise.all([
      getMonetizationConfig(),
      isMoneyModuleEnabledForUsers("coin.enabled"),
      isVipModuleEnabled(),
      getUserVipStatus(userId),
      getRewardedAdsAvailability({ userId, role }),
      getPurchaseUiPolicyForRequest()
    ]);

  const coinDisplayName = String(monetizationConfig.settings["coin.display_name"]);
  const coinPurchaseEnabled = Boolean(
    monetizationConfig.settings["coin.purchase_enabled"] &&
      monetizationConfig.settings["payments.enabled"]
  );

  const [walletResult, userTransactionsResult, chapterUnlocksResult] = await Promise.all([
    showCoinWallet ? getOrCreateUserWallet(userId) : Promise.resolve({ data: null, error: null }),
    showCoinWallet ? getTransactionsForUser(userId, 10) : Promise.resolve({ data: [], error: null }),
    showCoinWallet ? listChapterUnlocksByUser(userId, 10) : Promise.resolve({ data: [], error: null })
  ]);

  return {
    showCoinWallet,
    coinDisplayName,
    coinPurchaseEnabled: coinPurchaseEnabled && purchasePolicy.showSePayTopUp,
    wallet: walletResult.data,
    transactions: userTransactionsResult.data,
    chapterUnlocks: chapterUnlocksResult.data,
    rewardedAdsAvailability,
    vipEnabled,
    vipActive: vipStatus.isActive,
    vipPlan: vipStatus.plan,
    vipExpiresAt: vipStatus.subscription?.expires_at ?? null
  };
}

/** Flags + VIP badge only — no wallet I/O. */
export async function loadMeMonetizationFlags({
  role,
  userId
}: LoadMeMonetizationParams): Promise<MePageData["monetization"]> {
  const [monetizationConfig, showCoinWallet, vipEnabled, vipStatus, purchasePolicy] =
    await Promise.all([
      getMonetizationConfig(),
      isMoneyModuleEnabledForUsers("coin.enabled"),
      isVipModuleEnabled(),
      getUserVipStatus(userId),
      getPurchaseUiPolicyForRequest()
    ]);

  const coinDisplayName = String(monetizationConfig.settings["coin.display_name"]);
  const coinPurchaseEnabled = Boolean(
    monetizationConfig.settings["coin.purchase_enabled"] &&
      monetizationConfig.settings["payments.enabled"]
  );

  return {
    showCoinWallet,
    coinDisplayName,
    coinPurchaseEnabled: coinPurchaseEnabled && purchasePolicy.showSePayTopUp,
    wallet: null,
    transactions: [],
    chapterUnlocks: [],
    rewardedAdsAvailability: {
      enabled: false,
      providerMockEnabled: false,
      rewardCoinAmount: 0,
      dailyLimitPerUser: 0,
      cooldownMinutes: 0,
      minWatchSeconds: 0,
      bonusCoinExpiresDays: null,
      allowedUseForPaidChapters: false,
      allowedUseForTips: false,
      remainingToday: 0,
      nextAvailableAt: null,
      canStart: false,
      blockedReason: null
    },
    vipEnabled,
    vipActive: vipStatus.isActive,
    vipPlan: vipStatus.plan,
    vipExpiresAt: vipStatus.subscription?.expires_at ?? null
  };
}
