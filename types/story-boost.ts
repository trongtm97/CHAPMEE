export type BoostCurrency = "reward_points" | "coin";

export type BoostSettings = {
  enabled: boolean;
  rewardPointBoostEnabled: boolean;
  coinBoostEnabled: boolean;
  currency: BoostCurrency;
  minBoostPoints: number;
  pointsPerUnit: number;
  boostPointsPerUnit: number;
  userDailyCap: number;
  storyDailyCap: number;
  minStoryAgeHours: number;
  decayHalfLifeDays: number;
  rankingWeight: number;
  organicBlendMax: number;
  diminishingSameStory: number;
  allowCreatorSelfBoost: boolean;
  showPublicMessages: boolean;
  antiWhaleCapEnabled: boolean;
};

export type StoryBoostEligibility = {
  enabled: boolean;
  canBoost: boolean;
  reason: string | null;
  balance: number;
  pointsPerUnit: number;
  boostPointsPerUnit: number;
  userDailyRemaining: number;
  storyDailyRemaining: number;
  weeklyBoostPoints: number;
  weeklyUniqueBoosters: number;
};

export type SpendStoryBoostResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  boostId: string | null;
  boostPoints: number | null;
  newBalance: number | null;
};

export type StoryBoostSummary = {
  storyId: string;
  totalBoostPointsWeek: number;
  uniqueBoostersWeek: number;
};

export type AdminBoostInsightRow = {
  id: string;
  storyId: string;
  storyTitle: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  boostPoints: number;
  amountSpent: number;
  message: string | null;
  createdAt: string;
};

export type AdminTopBoostedStory = {
  storyId: string;
  storyTitle: string;
  storySlug: string;
  totalBoostPoints: number;
  uniqueBoosters: number;
};

export type AdminTopBooster = {
  userId: string;
  displayName: string | null;
  username: string | null;
  totalBoostPoints: number;
  boostCount: number;
};
