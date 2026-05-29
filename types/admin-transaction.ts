import type { TransactionRow } from "@/types/transaction";

export type TransactionSortOption =
  | "newest"
  | "oldest"
  | "amount_high"
  | "amount_low"
  | "coin_high"
  | "coin_low";

export type TransactionTypeFilter =
  | "all"
  | "coin_purchase"
  | "chapter_purchase"
  | "author_tip"
  | "virtual_gift"
  | "early_access"
  | "vip_subscription"
  | "fan_club_subscription"
  | "coin_reward"
  | "admin_coin_adjustment"
  | "refund"
  | "payout"
  | "chargeback"
  | "platform_fee";

export type TransactionStatusFilter =
  | "all"
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "partial_refund"
  | "reversed"
  | "chargeback"
  | "needs_review";

export type TransactionSourceFilter =
  | "all"
  | "sepay"
  | "apple_iap"
  | "google_play"
  | "admin"
  | "system"
  | "internal_wallet";

export type TransactionDashboardFilters = {
  search: string;
  type: TransactionTypeFilter;
  status: TransactionStatusFilter;
  source: TransactionSourceFilter;
  startDate: string;
  endDate: string;
  sort: TransactionSortOption;
  page: number;
  pageSize: 25 | 50 | 100;
  selectedId: string | null;
};

export type TransactionKpiSummary = {
  totalTransactions: number;
  totalCoinDeposited: number;
  totalCoinSpent: number;
  needsReviewCount: number;
};

export type TransactionRiskReason =
  | "manual_review"
  | "large_amount"
  | "refund_chargeback"
  | "admin_adjustment"
  | "webhook_error"
  | "repeated_failure";

export type AdminTransactionListRow = TransactionRow & {
  userLabel: string | null;
  userEmail: string | null;
  creatorLabel: string | null;
  relatedContent: string | null;
  storySlug: string | null;
  episodeNumber: number | null;
  riskReasons: TransactionRiskReason[];
  needsReview: boolean;
};

export type TransactionAuditEntry = {
  id: string;
  label: string;
  at: string | null;
  detail: string | null;
};

export type TransactionRefundInfo = {
  canRefund: boolean;
  refundedCoin: number | null;
  hasChargeback: boolean;
  processedBy: string | null;
  reason: string | null;
};

export type AdminTransactionDetail = AdminTransactionListRow & {
  performerLabel: string | null;
  recipientLabel: string | null;
  moneyFlow: {
    grossAmountVnd: number | null;
    providerFeeVnd: number | null;
    platformFeeVnd: number | null;
    paidCoinAmount: number | null;
    bonusCoinAmount: number | null;
    creatorGrossVnd: number | null;
    creatorNetVnd: number | null;
    platformRevenueVnd: number | null;
    walletBalanceBefore: number | null;
    walletBalanceAfter: number | null;
  };
  refundInfo: TransactionRefundInfo;
  auditLog: TransactionAuditEntry[];
};
