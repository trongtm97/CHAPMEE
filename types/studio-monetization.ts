import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { CreatorEligibilityResult } from "@/types/creator-monetization";
import type { CreatorAccessStatus } from "@/types/creator-access";
import type { CreatorPayoutAccount, PayoutMethod, PayoutRequest } from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";

export type StudioMonetizationGateStatus =
  | "disabled"
  | "not_eligible"
  | "pending_review"
  | "approved"
  | "admin_disabled"
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
  payoutProcessingDaysMin: number;
  payoutProcessingDaysMax: number;
  payoutProcessingDaysLabel: string;
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
  revenueSharePaidChapterPlatformPercent: number;
  revenueShareTipCreatorPercent: number;
  revenueShareTipPlatformPercent: number;
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
  chapterUnlockRevenueVnd: number;
  fullAccessRevenueVnd: number;
  lockedFullStoryRevenueVnd: number;
  fullStoryEscrowStoriesCount: number;
  grossRevenueVnd: number;
  platformFeeVnd: number;
  creatorNetRevenueVnd: number;
  revenue7dVnd: number;
  revenue30dVnd: number;
  paidStoriesCount: number;
  hasWallet: boolean;
};

export type StudioRevenuePolicySourceRow = {
  id: string;
  label: string;
  authorPercent: number;
  platformPercent: number;
  note: string;
};

export type StudioCreatorRevenuePolicyView = {
  badgeLabel: "Theo chính sách mặc định" | "Chính sách riêng";
  policyName: string | null;
  effectiveFromLabel: string | null;
  scheduledChangeLabel: string | null;
  scheduledPolicyName: string | null;
  publicNote: string | null;
  showDetails: boolean;
  sourceRows: StudioRevenuePolicySourceRow[];
  paidChapterExample: {
    coinPrice: number;
    authorCoin: number;
    platformCoin: number;
    coinDisplayName: string;
  };
  tipNote?: string;
  fullStoryHoldRules: string[];
  fullStoryHoldDaysAfterCompletion: number;
  withdrawal: {
    minWithdrawVnd: number;
    processingDaysLabel: string;
    requiresAdminApproval: boolean;
    requiresIdentityVerification: boolean;
    requiresPin: boolean;
    platformWithdrawalsEnabled: boolean;
    creatorWithdrawalBlocked: boolean;
    creatorWithdrawalBlockReason: string | null;
  };
  coinToVndRate: number;
  coinDisplayName: string;
};

export type StudioStoryMonetizationRow = {
  storyId: string;
  title: string;
  slug: string;
  publicCode: string;
  structureType: "chaptered" | "standalone";
  status: string;
  visibility: string;
  isCompleted: boolean;
  updatedAt: string;
  coverUrl: string | null;
  genreName: string | null;
  readCount: number;
  monetizationEnabled: boolean;
  paidChapterCount: number;
  totalChapterCount: number;
  freeChaptersCount: number;
  defaultCoinPrice: number | null;
  revenueVnd: number;
  unlockCount: number;
  fullAccessEnabled: boolean;
  fullAccessPriceCoin: number | null;
  autoPricingEnabled: boolean;
  freeFirstChaptersCount: number;
  autoPriceCoin: number | null;
  adminCompletionStatus?: import("@/types/story-completion").StoryAdminCompletionStatus;
  lockedFullStoryRevenueVnd?: number;
  contentOrigin: "original" | "translation";
  rightsStatus: string;
  canSellChapters: boolean;
  canSellStoryBundle: boolean;
  canUseCoinUnlock: boolean;
  canReceiveTips: boolean;
  canShareAdsRevenue: boolean;
  originPolicyNote: string | null;
};

export type StudioMonetizationRecentTransaction = {
  id: string;
  typeLabel: string;
  amountVnd: number;
  coinAmount: number | null;
  contentLabel: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  kind?: "chapter" | "bundle" | "tip" | "refund" | "other";
};

export type StudioMonetizationWithdrawState = {
  canRequestWithdrawal: boolean;
  blockReason: string | null;
  amountNeededVnd: number | null;
};

import type { StudioMonetizationGenreOption } from "@/types/studio-monetization-stories";

export type StudioMonetizationPageData = {
  gateStatus: StudioMonetizationGateStatus;
  canConfigure: boolean;
  creatorAccess: CreatorAccessStatus;
  config: StudioMonetizationConfigView;
  overview: StudioMonetizationOverview;
  eligibility: CreatorEligibilityResult;
  profile: CreatorMonetizationProfile | null;
  storiesTotalCount: number;
  genreOptions: StudioMonetizationGenreOption[];
  recentTransactions: StudioMonetizationRecentTransaction[];
  withdrawState: StudioMonetizationWithdrawState;
  wallet: CreatorWallet | null;
  payoutAccounts: CreatorPayoutAccount[];
  payoutRequests: PayoutRequest[];
  revenuePolicy: StudioCreatorRevenuePolicyView | null;
  error: string | null;
};
