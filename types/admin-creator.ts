import type { CreatorMonetizationStatus } from "@/types/creator-monetization";

export type CreatorStudioStatus = "active" | "suspended" | "none";

export type CreatorVerificationFilter =
  | "all"
  | "unverified"
  | "pending"
  | "verified"
  | "blue_tick"
  | "rejected";

export type CreatorMonetizationFilter =
  | "all"
  | "not_eligible"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "permanently_disabled";

export type CreatorStudioFilter = "all" | "active" | "suspended" | "no_studio";

export type CreatorQualityFilter =
  | "all"
  | "normal"
  | "warned"
  | "low_quality"
  | "hidden"
  | "violations";

export type CreatorFinanceFilter =
  | "all"
  | "has_revenue"
  | "has_balance"
  | "pending_payout"
  | "payout_disabled";

export type CreatorSortOption =
  | "newest"
  | "revenue"
  | "reads"
  | "stories"
  | "reports"
  | "pending_first";

export type CreatorSummaryCardKey =
  | "totalCreators"
  | "activeStudios"
  | "pendingMonetization"
  | "monetizationEnabled"
  | "monetizationSuspended"
  | "pendingVerification"
  | "blueTick"
  | "pendingPayoutRequests"
  | "lowQualityContent"
  | "warnedCreators";

export type CreatorDashboardFilters = {
  query: string;
  studio: CreatorStudioFilter;
  monetization: CreatorMonetizationFilter;
  verification: CreatorVerificationFilter;
  quality: CreatorQualityFilter;
  finance: CreatorFinanceFilter;
  sort: CreatorSortOption;
  page: number;
  pageSize: 25 | 50 | 100;
  selectedUserId?: string;
  summaryCard?: CreatorSummaryCardKey;
};

export type CreatorOperationsSummary = Record<CreatorSummaryCardKey, number>;

export type AdminCreatorListRow = {
  userId: string;
  creatorProfileId: string | null;
  monetizationProfileId: string | null;
  displayName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  studioName: string | null;
  studioStatus: CreatorStudioStatus;
  monetizationStatus: CreatorMonetizationStatus | "none";
  monetizationEnabled: boolean;
  verificationLabel: string | null;
  isVerified: boolean;
  hasBlueTick: boolean;
  storyCount: number;
  chapterCount: number;
  totalReads: number;
  netRevenueVnd: number;
  availableBalanceVnd: number;
  qualityWarningCount: number;
  hiddenStoryCount: number;
  appealCount: number;
  violationCount: number;
  hasActiveWarning: boolean;
  payoutEnabled: boolean;
  pendingPayoutCount: number;
  createdAt: string;
};

export type CreatorRevenueSharePercents = {
  paidChapter: number;
  tip: number;
  fanClub: number;
  vipPool: number;
  bonusPool: number;
};

export type CreatorAdminOverrides = {
  payoutMinAmount?: number | null;
  internalNote?: string | null;
  strategicPartner?: boolean;
  bonusPoolEligible?: boolean;
  featuredAuthorEligible?: boolean;
  monetizationEnabledOverride?: boolean | null;
};

export type CreatorMonetizationEligibilityItem = {
  key: string;
  label: string;
  description: string;
  met: boolean;
};

export type CreatorDetailTab =
  | "overview"
  | "studio"
  | "monetization"
  | "revenue"
  | "payout"
  | "content"
  | "quality"
  | "violations"
  | "verification"
  | "overrides"
  | "audit";

export type AdminCreatorDetail = {
  userId: string;
  creatorProfileId: string | null;
  monetizationProfileId: string | null;
  displayName: string | null;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  accountCreatedAt: string;
  studioCreatedAt: string | null;
  studioName: string | null;
  studioBio: string | null;
  studioStatus: CreatorStudioStatus;
  monetizationStatus: CreatorMonetizationStatus | "none";
  monetizationEnabled: boolean;
  payoutEnabled: boolean;
  isVerified: boolean;
  verificationType: string | null;
  verificationLabel: string | null;
  hasBlueTick: boolean;
  hasActiveWarning: boolean;
  customRevenueShare: CreatorRevenueSharePercents | null;
  useCustomRevenueShare: boolean;
  adminOverrides: CreatorAdminOverrides;
  stats: {
    storyCount: number;
    chapterCount: number;
    totalReads: number;
    followCount: number;
    commentCount: number;
    saveCount: number;
    netRevenueVnd: number;
    availableBalanceVnd: number;
    pendingRevenueVnd: number;
    totalWithdrawnVnd: number;
  };
  eligibility: CreatorMonetizationEligibilityItem[];
  rejectedReason: string | null;
  suspendedReason: string | null;
  defaultRevenueShare: CreatorRevenueSharePercents;
  revenueShareHistory: Array<{
    id: string;
    enabled: boolean;
    percents: CreatorRevenueSharePercents;
    reason: string;
    createdAt: string;
    createdByLabel: string | null;
  }>;
  payoutRequests: Array<{
    id: string;
    amountVnd: number;
    status: string;
    requestedAt: string;
    reviewedAt: string | null;
    completedAt: string | null;
    adminNote: string | null;
  }>;
  recentStories: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    monetizationStatus: string;
    readCount: number;
  }>;
  qualityCases: Array<{
    id: string;
    storyId: string;
    storyTitle: string;
    attempt: number;
    action: string;
    createdAt: string;
  }>;
  strikes: Array<{
    id: string;
    reason: string | null;
    createdAt: string;
    expiresAt: string | null;
    isActive: boolean;
  }>;
  verifications: Array<{
    id: string;
    type: string;
    status: string;
    submittedAt: string | null;
    reviewedAt: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    actorLabel: string | null;
    createdAt: string;
    reason: string | null;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
  }>;
  ledgerPreview: Array<{
    id: string;
    type: string;
    amountVnd: number;
    direction: string;
    createdAt: string;
    description: string | null;
  }>;
};

export type CreatorAdminCapabilities = {
  canViewPayoutDetail: boolean;
  canManageMonetization: boolean;
  canManageRevenueShare: boolean;
  canManagePayout: boolean;
  canManageVerification: boolean;
  canModerateContent: boolean;
  canManageStudio: boolean;
  isSupportLimited: boolean;
};

export type MonetizationActionType =
  | "approve"
  | "reject"
  | "suspend"
  | "restore"
  | "permanent_disable"
  | "request_info";
