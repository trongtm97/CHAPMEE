import type { ContentQualityReasonCode, ContentQualityStatus } from "@/types/content-quality";
import type { PayoutMethod, PayoutRequestStatus } from "@/types/payout";

export type AdminContentQualityTab =
  | "pending_review"
  | "waiting_author"
  | "appealing"
  | "at_risk"
  | "restored"
  | "permanently_hidden"
  | "all";

export type ContentQualityRiskLevel = "low" | "medium" | "high" | "critical";

export type AdminContentQualityQueueItem = {
  storyId: string;
  title: string;
  slug: string | null;
  authorPenName: string;
  authorUserId: string;
  creatorId: string;
  qualityStatus: ContentQualityStatus;
  attemptCount: number;
  maxAttempts: number;
  reasonCodes: ContentQualityReasonCode[];
  warnedAt: string | null;
  appealStatus: "none" | "pending" | "approved" | "rejected";
  monetizationDisabled: boolean;
  riskLevel: ContentQualityRiskLevel;
  genreName: string | null;
  targetType: "story";
};

export type AdminContentQualitySummary = {
  pendingReview: number;
  waitingAuthor: number;
  appealing: number;
  atRisk: number;
  restored: number;
  permanentlyHidden: number;
  monetizationDisabled: number;
  processedToday: number;
};

export type AdminContentQualityRecentlyHandled = {
  id: string;
  title: string;
  actionLabel: string;
  moderatorName: string | null;
  createdAt: string;
};

export type AdminContentQualityPageData = {
  items: AdminContentQualityQueueItem[];
  allItems: AdminContentQualityQueueItem[];
  counts: Record<AdminContentQualityTab, number>;
  summary: AdminContentQualitySummary;
  recentlyHandled: AdminContentQualityRecentlyHandled[];
  maxAttempts: number;
  canModerate: boolean;
  canRefund: boolean;
  canManageMonetization: boolean;
  error: string | null;
};

/** @deprecated use AdminContentQualityPageData */
export type AdminContentQualityQueueResult = AdminContentQualityPageData;

export type AdminWithdrawalTab =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed";

export type AdminWithdrawalQueueItem = {
  id: string;
  creatorUserId: string;
  creatorLabel: string;
  amountVnd: number;
  method: PayoutMethod;
  payoutMasked: string;
  status: PayoutRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  adminNote: string | null;
  rejectReason: string | null;
  availableBalanceVnd: number | null;
  lockedBalanceVnd: number | null;
};

export type AdminFinanceOverview = {
  pendingWithdrawalCount: number;
  pendingWithdrawalAmountVnd: number;
  completedWithdrawalAmountVnd: number;
  creatorsWithRevenueCount: number;
  anomalyFlags: string[];
};

export type AdminAuditLogEntry = {
  note?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};
