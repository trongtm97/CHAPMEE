import type {
  CreatorFeePolicyCreatorType,
  CreatorFeePolicyStatus,
  CreatorFeeRevenueSourceId
} from "@/types/creator-fee-policy";

export type CreatorFeePolicySort =
  | "newest"
  | "expiring_soon"
  | "creator_revenue_desc"
  | "custom_rate_desc"
  | "custom_rate_asc";

export type CreatorFeeEffectiveFilter =
  | "all"
  | "currently_effective"
  | "upcoming"
  | "past";

export type CreatorFeePolicyDashboardFilters = {
  search: string;
  status: CreatorFeePolicyStatus | "all";
  creatorType: CreatorFeePolicyCreatorType | "all";
  revenueSource: CreatorFeeRevenueSourceId | "all";
  effective: CreatorFeeEffectiveFilter;
  sort: CreatorFeePolicySort;
  page: number;
  pageSize: number;
  selectedPolicyId: string | null;
  selectedCreatorId: string | null;
  createMode: boolean;
};

export type CreatorFeePolicyKpiSummary = {
  activeCount: number;
  expiringSoonCount: number;
  customRateCreatorCount: number;
  originalsCount: number;
  pausedCount: number;
  customPolicyTxToday: number;
};

export type CreatorFeePolicyListRow = {
  id: string;
  creatorId: string;
  creatorDisplayName: string;
  creatorUsername: string | null;
  creatorEmail: string | null;
  creatorAvatarUrl: string | null;
  studioName: string | null;
  creatorType: CreatorFeePolicyCreatorType | null;
  status: CreatorFeePolicyStatus;
  policyName: string;
  startsAt: string;
  endsAt: string | null;
  paidChapterAuthorPercent: number | null;
  paidChapterPlatformPercent: number | null;
  tipAuthorPercent: number | null;
  tipPlatformPercent: number | null;
  vipAuthorPercent: number | null;
  vipPlatformPercent: number | null;
  giftAuthorPercent: number | null;
  giftPlatformPercent: number | null;
  sponsoredAuthorPercent: number | null;
  sponsoredPlatformPercent: number | null;
  updatedByLabel: string | null;
  updatedAt: string;
  transactionCount: number;
  revenue30dVnd: number;
};

export type CreatorFeePolicyAdminCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canPause: boolean;
  canRevoke: boolean;
  canExport: boolean;
  canViewAudit: boolean;
};

export type CreatorFeePolicyCreatorSummary = {
  userId: string;
  displayName: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  studioName: string | null;
  verificationStatus: string | null;
  hasBlueTick: boolean;
  monetizationStatus: string | null;
  storyCount: number;
  chapterCount: number;
  revenue30dVnd: number;
  withdrawalCount: number;
  riskWarnings: string[];
};

import type { CreatorFeePolicyRow } from "@/types/creator-fee-policy";

export type CreatorFeePolicyDetail = {
  policyRow: CreatorFeePolicyRow;
  policy: CreatorFeePolicyListRow & {
    sourceRates: import("@/types/creator-fee-policy").CreatorFeeSourceRates | null;
    note: string | null;
    publicNote: string | null;
    contractRef: string | null;
    showDetailsToCreator: boolean;
    createdByLabel: string | null;
    createdAt: string;
    revokedAt: string | null;
    revokedReason: string | null;
  };
  creator: CreatorFeePolicyCreatorSummary;
  defaultRates: import("@/types/creator-fee-policy").CreatorFeeSourceRates;
  auditHistory: import("@/types/creator-fee-policy").CreatorFeePolicyAuditEntry[];
};

export type CreatorFeePolicyModalState =
  | { type: "pause"; policyId: string; policyName: string }
  | { type: "revoke"; policyId: string; policyName: string }
  | { type: "resume"; policyId: string; policyName: string }
  | { type: "duplicate"; policyId: string }
  | null;
