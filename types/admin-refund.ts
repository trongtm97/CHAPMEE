export const REFUND_STATUSES = [
  "pending",
  "reviewing",
  "approved",
  "processing",
  "completed",
  "rejected",
  "failed",
  "cancelled"
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

/** Legacy statuses mapped at read time */
export type LegacyRefundStatus = "requested" | "processed";

export const REFUND_TYPES = [
  "chapter_unlock_refund",
  "story_purchase_refund",
  "tip_refund",
  "gift_refund",
  "vip_refund",
  "fanclub_refund",
  "quality_low_refund",
  "violation_refund",
  "admin_manual_refund",
  "duplicate_payment_refund",
  "system_error_refund",
  "coin_purchase_refund"
] as const;

export type RefundType = (typeof REFUND_TYPES)[number];

export const REFUND_SOURCES = [
  "user_request",
  "admin_manual",
  "content_quality_action",
  "moderation_action",
  "payment_error",
  "chargeback_related"
] as const;

export type RefundSource = (typeof REFUND_SOURCES)[number];

export const REFUND_COIN_TYPES = ["paid_coin", "bonus_coin", "all"] as const;
export type RefundCoinType = (typeof REFUND_COIN_TYPES)[number];

export type RefundRecord = {
  id: string;
  originalTransactionId: string;
  userId: string | null;
  creatorUserId: string | null;
  storyId: string | null;
  chapterId: string | null;
  amountVnd: number | null;
  coinAmount: number | null;
  refundType: RefundType | null;
  source: RefundSource | null;
  coinType: RefundCoinType | null;
  reason: string | null;
  reasonPublic: string | null;
  reasonInternal: string | null;
  status: RefundStatus;
  provider: string | null;
  providerReference: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  completedBy: string | null;
  processedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  processedAt: string | null;
  failureReason: string | null;
  qualityCaseId: string | null;
  coinRefundBatchId: string | null;
  isHighRisk: boolean;
  metadata: Record<string, unknown> | null;
};

export type RefundListKind = "refund" | "quality_batch";

export type AdminRefundListRow = {
  id: string;
  kind: RefundListKind;
  refundId: string;
  buyerUserId: string | null;
  buyerUsername: string | null;
  buyerEmail: string | null;
  creatorUserId: string | null;
  creatorUsername: string | null;
  originalTransactionId: string | null;
  contentLabel: string | null;
  storyId: string | null;
  chapterId: string | null;
  refundType: RefundType | string | null;
  source: RefundSource | string | null;
  coinAmount: number;
  amountVnd: number | null;
  coinType: RefundCoinType | string | null;
  status: RefundStatus | string;
  reason: string | null;
  createdByUsername: string | null;
  createdAt: string;
  slaHours: number | null;
  isHighRisk: boolean;
  qualityCaseId: string | null;
  coinRefundBatchId: string | null;
};

export type RefundKpiSummary = {
  pendingCount: number;
  processingCount: number;
  completedTodayCount: number;
  totalCoinRefunded: number;
  totalVndRefunded: number;
  qualityLowCount: number;
  adminManualCount: number;
  failedOrReviewCount: number;
};

export type RefundDashboardFilters = {
  search: string;
  status: RefundStatus | "all";
  refundType: RefundType | "all";
  source: RefundSource | "all";
  coinType: RefundCoinType | "all";
  startDate: string;
  endDate: string;
  highRiskOnly: boolean;
  creatorUserId: string;
  storyId: string;
  chapterId: string;
  page: number;
  pageSize: number;
  selectedId: string | null;
  sort: "newest" | "oldest" | "coin_desc" | "coin_asc";
  createMode: boolean;
  prefilledTx: string;
  prefilledUserId: string;
};

export type RefundAuditEntry = {
  id: string;
  action: string;
  actorUsername: string | null;
  at: string;
  detail: string | null;
  metadata: Record<string, unknown> | null;
};

export type RefundProcessingHistoryEntry = {
  id: string;
  label: string;
  at: string;
  actorUsername: string | null;
  detail: string | null;
};

export type AdminRefundDetail = {
  refund: RefundRecord;
  kind: RefundListKind;
  buyer: {
    userId: string | null;
    username: string | null;
    email: string | null;
    displayName: string | null;
    accountStatus: string | null;
  };
  creator: {
    userId: string | null;
    username: string | null;
    displayName: string | null;
  };
  originalTransaction: {
    id: string;
    type: string;
    coinAmount: number | null;
    paidCoinAmount: number | null;
    bonusCoinAmount: number | null;
    moneyAmountVnd: number | null;
    createdAt: string;
    status: string;
  } | null;
  content: {
    storyId: string | null;
    storyTitle: string | null;
    chapterId: string | null;
    chapterTitle: string | null;
    contentStatus: string | null;
  };
  processingHistory: RefundProcessingHistoryEntry[];
  auditLog: RefundAuditEntry[];
  evidence: string | null;
};

export type RefundPreviewImpact = {
  buyerCreditCoin: number;
  buyerCreditPaidCoin: number;
  buyerCreditBonusCoin: number;
  creatorRevenueReversalVnd: number;
  platformRevenueReversalVnd: number;
  ledgerEntries: Array<{
    type: string;
    direction: string;
    amount: number;
    coinType?: string;
    target: string;
  }>;
  warnings: string[];
  canSubmit: boolean;
};

export type CreateManualRefundPayload = {
  userId: string;
  originalTransactionId: string;
  refundType: RefundType;
  coinAmount: number;
  coinType: RefundCoinType;
  reasonPublic: string;
  reasonInternal?: string | null;
  creditBuyerWallet: boolean;
  reverseCreatorRevenue: boolean;
  keepContentUnlocked: boolean;
  revokeContentAccess: boolean;
  notifyBuyer: boolean;
  notifyCreator: boolean;
  overrideDuplicate?: boolean;
  overrideReason?: string | null;
};

export type RefundAdminCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canComplete: boolean;
  canOverride: boolean;
  canExport: boolean;
  canViewAudit: boolean;
};
