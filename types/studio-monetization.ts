import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { CreatorEligibilityResult } from "@/types/creator-monetization";
import type { CreatorPayoutAccount, PayoutMethod, PayoutRequest } from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";

export type StudioMonetizationGateStatus =
  | "disabled"
  | "not_eligible"
  | "pending_review"
  | "approved"
  | "suspended"
  | "rejected";

export type StudioMonetizationConfigView = {
  ecosystemEnabled: boolean;
  creatorMonetizationEnabled: boolean;
  showMoneyUiToCreators: boolean;
  paidChaptersEnabled: boolean;
  tipsEnabled: boolean;
  payoutsEnabled: boolean;
  coinEnabled: boolean;
  coinDisplayName: string;
  coinExchangeRateVnd: number;
  minWithdrawAmountVnd: number;
  payoutHoldDays: number;
  payoutKycRequired: boolean;
  payoutAllowedMethods: PayoutMethod[];
  payoutProcessingNote: string;
  paidChapterMinCoinPrice: number;
  paidChapterMaxCoinPrice: number;
  paidChapterDefaultCoinPrice: number;
  paidChapterFreeChaptersRequired: number;
  paidChapterAllowCustomPrice: boolean;
  revenueShareCreatorPercent: number;
  revenueSharePlatformPercent: number;
  revenueSharePaidChapterCreatorPercent: number;
  revenueShareTipCreatorPercent: number;
  policyText: string;
};

export type StudioMonetizationOverview = {
  availableRevenueVnd: number;
  pendingRevenueVnd: number;
  lockedRevenueVnd: number;
  totalEarnedVnd: number;
  totalWithdrawnVnd: number;
  tipsReceivedVnd: number;
  paidUnlockCount: number;
  paidUnlockRevenueVnd: number;
  grossRevenueVnd: number;
  platformFeeVnd: number;
  creatorNetRevenueVnd: number;
  hasWallet: boolean;
};

export type StudioStoryMonetizationRow = {
  storyId: string;
  title: string;
  slug: string;
  monetizationEnabled: boolean;
  paidChapterCount: number;
  totalChapterCount: number;
  freeChaptersCount: number;
  defaultCoinPrice: number | null;
  revenueVnd: number;
};

export type StudioMonetizationPageData = {
  gateStatus: StudioMonetizationGateStatus;
  canConfigure: boolean;
  config: StudioMonetizationConfigView;
  overview: StudioMonetizationOverview;
  eligibility: CreatorEligibilityResult;
  profile: CreatorMonetizationProfile | null;
  stories: StudioStoryMonetizationRow[];
  wallet: CreatorWallet | null;
  payoutAccounts: CreatorPayoutAccount[];
  payoutRequests: PayoutRequest[];
  error: string | null;
};
