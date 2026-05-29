export type RewardedAdSessionStatus =
  | "started"
  | "completed"
  | "rewarded"
  | "failed"
  | "cancelled";

export type RewardedAdProvider = "mock" | "unknown";

export type RewardedAdSession = {
  id: string;
  user_id: string;
  provider: RewardedAdProvider;
  status: RewardedAdSessionStatus;
  reward_coin_amount: number;
  watched_seconds: number | null;
  provider_reference: string | null;
  transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
  rewarded_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type RewardedAdsAvailability = {
  enabled: boolean;
  providerMockEnabled: boolean;
  rewardCoinAmount: number;
  dailyLimitPerUser: number;
  cooldownMinutes: number;
  minWatchSeconds: number;
  bonusCoinExpiresDays: number | null;
  allowedUseForPaidChapters: boolean;
  allowedUseForTips: boolean;
  remainingToday: number;
  nextAvailableAt: string | null;
  canStart: boolean;
  blockedReason: string | null;
};
