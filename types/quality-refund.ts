export const MONETIZATION_STATUSES = [
  "paid",
  "free",
  "disabled",
  "free_due_to_quality",
  "disabled_due_to_quality"
] as const;

export type MonetizationStatus = (typeof MONETIZATION_STATUSES)[number];

export const FREE_ACCESS_REASONS = [
  "quality_low",
  "policy_violation",
  "author_request",
  "admin_decision",
  "refund_case",
  "other"
] as const;

export type FreeAccessReason = (typeof FREE_ACCESS_REASONS)[number];

export const QUALITY_REFUND_SCOPES = [
  "all_purchases",
  "last_7_days",
  "last_30_days",
  "custom_range"
] as const;

export type QualityRefundScope = (typeof QUALITY_REFUND_SCOPES)[number];

export const QUALITY_REFUND_PERCENT_PRESETS = ["100", "50", "custom"] as const;

export type QualityRefundPercentPreset = (typeof QUALITY_REFUND_PERCENT_PRESETS)[number];

export const QUALITY_REFUND_PURCHASE_SCOPES = [
  "chapter_only",
  "whole_story"
] as const;

export type QualityRefundPurchaseScope =
  (typeof QUALITY_REFUND_PURCHASE_SCOPES)[number];

export const QUALITY_REFUND_REASON_CODES = [
  "quality_low",
  "free_after_purchase",
  "content_hidden",
  "other"
] as const;

export type QualityRefundReasonCode = (typeof QUALITY_REFUND_REASON_CODES)[number];

export const COIN_REFUND_BATCH_STATUSES = [
  "preview",
  "pending",
  "processing",
  "completed",
  "partial_failed",
  "failed",
  "cancelled"
] as const;

export type CoinRefundBatchStatus = (typeof COIN_REFUND_BATCH_STATUSES)[number];

export type QualityMonetizationImpact = {
  targetType: "story" | "chapter";
  targetId: string;
  storyId: string;
  storyTitle: string;
  monetizationStatus: MonetizationStatus;
  monetizationDisabled: boolean;
  buyerCount: number;
  totalCoinCollected: number;
  totalPaidCoinCollected: number;
  totalBonusCoinCollected: number;
  totalCoinRefunded: number;
  creatorRevenueVnd: number;
  pendingRefundBatchCount: number;
  completedRefundBatchCount: number;
  hasPartialRefunds: boolean;
};

export type QualityRefundPreviewItem = {
  unlockId: string;
  userId: string;
  originalTransactionId: string;
  originalCoinAmount: number;
  originalPaidCoinAmount: number;
  originalBonusCoinAmount: number;
  refundCoinAmount: number;
  refundPaidCoinAmount: number;
  refundBonusCoinAmount: number;
  alreadyRefundedAmount: number;
  purchasedAt: string;
  previouslyRefunded: boolean;
};

export type QualityRefundPreview = {
  items: QualityRefundPreviewItem[];
  userCount: number;
  transactionCount: number;
  totalCoinRefund: number;
  totalPaidCoinRefund: number;
  totalBonusCoinRefund: number;
  totalCoinPaid: number;
  totalCoinBonus: number;
  previouslyRefundedCount: number;
  duplicateWarning: boolean;
  emptyMessage: string | null;
};

export type CoinRefundBatchSummary = {
  id: string;
  status: CoinRefundBatchStatus;
  reasonCode: QualityRefundReasonCode;
  refundScope: QualityRefundScope;
  refundPercent: number | null;
  totalUsers: number;
  totalTransactions: number;
  totalCoinRefunded: number;
  authorNote: string | null;
  createdAt: string;
  confirmedAt: string | null;
};
