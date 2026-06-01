import type { PayoutMethod, PayoutRequestStatus } from "@/types/payout";
import type { CreatorWallet } from "@/types/wallet";
import type { TransactionRow } from "@/types/transaction";

/** Admin finance dashboard time filter (existing). */
export type FinanceTimeFilter = "today" | "7d" | "30d" | "month" | "all" | "custom";

export type FinanceUrgencyLevel = "normal" | "warning" | "danger";

export type FinanceUrgentItem = {
  id: string;
  label: string;
  count: number;
  level: FinanceUrgencyLevel;
  href: string;
  statusText: string;
};

export type FinancePeriodMetric = {
  value: number;
  previousValue: number;
  changePercent: number | null;
};

export type FinanceDailyTrendPoint = {
  date: string;
  revenueVnd: number;
  coinPurchased: number;
  coinSpent: number;
  payoutVnd: number;
};

export type FinancePaymentStatusSummary = {
  sepayConfigured: boolean;
  sepayWebhookStatus: "ok" | "error" | "not_configured";
  lastWebhookAt: string | null;
  pending: number;
  paid: number;
  failed: number;
  expired: number;
  duplicate: number;
  manualReview: number;
};

export type FinanceReconciliationSummary = {
  pendingCount: number;
  level: FinanceUrgencyLevel;
};

export type FinanceExtendedRisk = {
  suspiciousTransactions: number;
  coinLedgerMismatch: number;
  payoutBlockedAuthors: number;
  abnormalRefunds: number;
  abnormalTopupUsers: number;
  abnormalBonusRecipients: number;
  openChargebacks: number;
  blockedPayouts: number;
};

export type FinanceRefundPanel = {
  refundRequests: number;
  refundAmountVnd: number;
  openChargebacks: number;
  chargebackAmountVnd: number;
  coinsRefunded: number;
  usersRefunded: number;
};

export type FinanceCapabilities = {
  canViewDashboard: boolean;
  canViewTransactions: boolean;
  canViewPayouts: boolean;
  canApprovePayouts: boolean;
  canViewRefunds: boolean;
  canCreateRefunds: boolean;
  canExportReports: boolean;
  canViewRisk: boolean;
};

export type RevenueBreakdownItem = {
  source: string;
  amountVnd: number;
  ratio: number;
  transactionCount: number;
};

export type CoinEconomyMetrics = {
  paidCoinSold: number;
  bonusCoinGranted: number;
  spentByModule: Array<{ module: string; coin: number }>;
  remainingPaidCoinBalance: number;
  remainingBonusCoinBalance: number;
  bonusCoinSpendRatio: number;
  suspiciousBonusCoinUsageCount: number;
  coinsRefunded: number;
  adminCoinAdjusted: number;
  negativeCoinTransactions: number;
  unpaidCoinCredits: number;
};

export type FinanceCreatorRow = {
  creatorUserId: string;
  creatorName: string;
  studioName: string | null;
  grossRevenueVnd: number;
  netRevenueVnd: number;
  purchaseCount: number;
  supporterCount: number;
  withdrawnVnd: number;
};

export type FinanceRefundedStoryRow = {
  storyId: string;
  storyTitle: string;
  authorName: string | null;
  refundCount: number;
  refundCoin: number;
  refundAmountVnd: number;
};

export type FinanceSupporterRow = {
  userId: string;
  displayName: string;
  totalCoin: number;
  tipCount: number;
};

export type FinanceStoryChapterRow = {
  id: string;
  storyId: string | null;
  chapterId: string | null;
  label: string;
  storyTitle: string | null;
  authorName: string | null;
  totalCoin: number;
  revenueVnd: number;
  unlockCount: number;
  refundRate: number;
};

export type FinanceDashboardData = {
  filter: FinanceTimeFilter;
  rangeLabel: string;
  rangeFrom: string | null;
  rangeTo: string | null;
  isEmptyPeriod: boolean;
  urgentItems: FinanceUrgentItem[];
  urgentAllClear: boolean;
  primaryKpis: {
    totalTopupVnd: FinancePeriodMetric;
    platformRevenueVnd: FinancePeriodMetric;
    authorNetRevenueVnd: FinancePeriodMetric;
    totalWithdrawnVnd: FinancePeriodMetric;
  };
  dailyTrend: FinanceDailyTrendPoint[];
  paymentStatus: FinancePaymentStatusSummary;
  reconciliation: FinanceReconciliationSummary;
  extendedRisk: FinanceExtendedRisk;
  refundPanel: FinanceRefundPanel;
  creatorsWithRevenueCount: number;
  kpis: {
    grossRevenueVnd: number;
    platformRevenueVnd: number;
    creatorGrossRevenueVnd: number;
    creatorNetRevenueVnd: number;
    pendingCreatorRevenueVnd: number;
    availableCreatorRevenueVnd: number;
    lockedCreatorRevenueVnd: number;
    totalPayoutRequestedVnd: number;
    totalPayoutCompletedVnd: number;
    refundAmountVnd: number;
    chargebackAmountVnd: number;
    coinPurchased: number;
    coinSpent: number;
    bonusCoinIssued: number;
    paidUsers: number;
    payingConversionRate: number;
    refundRequests: number;
    chargebackOpenCases: number;
  };
  revenueBreakdown: RevenueBreakdownItem[];
  coinEconomy: CoinEconomyMetrics;
  topEarningAuthors: FinanceCreatorRow[];
  topSupporters: FinanceSupporterRow[];
  topPaidStories: FinanceStoryChapterRow[];
  topPaidChapters: FinanceStoryChapterRow[];
  topRefundedStories: FinanceRefundedStoryRow[];
  recentTransactionTotal: number;
  payoutOverview: {
    requested: number;
    underReview: number;
    completed: number;
    rejected: number;
    failed: number;
    averagePayoutAmount: number;
    totalRequestedAmount: number;
    totalCompletedAmount: number;
    recent: Array<{
      id: string;
      creatorUserId: string;
      amountVnd: number;
      status: PayoutRequestStatus;
      createdAt: string;
    }>;
  };
  riskOverview: {
    openHighCritical: number;
    lockedRevenueDueToRisk: number;
    payoutBlockedCreators: number;
    suspiciousTransactions: number;
  };
  recentTransactions: TransactionRow[];
  recentTransactionRiskIds: string[];
};

/** ChapMee Studio creator finance (author-facing). */

export type CreatorWalletLedgerType =
  | "chapter_unlock_revenue"
  | "story_unlock_revenue"
  | "tip_revenue"
  | "bonus"
  | "adjustment"
  | "earning_net_credit"
  | "withdrawal_hold"
  | "withdrawal_paid"
  | "withdrawal_refund"
  | "adjustment_credit"
  | "adjustment_debit"
  | "penalty_hold"
  | "penalty_release";

export type CreatorEarningSourceType =
  | "chapter_unlock"
  | "story_unlock"
  | "tip"
  | "bonus"
  | "adjustment";

export type CreatorEarningStatus =
  | "pending"
  | "settled"
  | "reversed"
  | "refunded"
  | "under_review";

export type CreatorEarningCalculationSnapshot = {
  roundingRule: string;
  coinToVndRate: number;
  coinAmount: number | null;
  grossAmountVnd: number;
  platformFeeVnd: number;
  paymentProcessingFeeVnd: number;
  taxOrAdjustmentVnd: number;
  creatorNetAmountVnd: number;
  revenueBasis?: string;
  moduleType?: string;
  creatorPercent?: number;
  feePercentApplied?: number;
  paymentChannel?: string;
  provider?: string;
  policySource?: "default_config" | "creator_override";
  policyId?: string | null;
  policyName?: string | null;
  appliedPolicyType?: "default" | "custom";
  revenueSourceSnapshot?: string;
  policyEffectiveFromSnapshot?: string | null;
  authorPercentSnapshot?: number;
  platformPercentSnapshot?: number;
  platformFeePercent?: number;
  creatorRevenueSharePercent?: number;
  paymentProcessingFeePercent?: number;
  paymentProcessingFixedFeeVnd?: number;
  minWithdrawAmountOverride?: number | null;
  feeRules?: Record<string, unknown>;
  calculatedAt: string;
};

export type CreatorEarningTransactionRow = {
  id: string;
  creator_user_id: string;
  buyer_user_id: string | null;
  source_type: CreatorEarningSourceType;
  source_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  legacy_transaction_id: string | null;
  coin_amount: number | null;
  coin_to_vnd_rate: number | null;
  gross_amount_vnd: number;
  platform_fee_vnd: number;
  payment_processing_fee_vnd: number;
  tax_or_adjustment_vnd: number;
  creator_net_amount_vnd: number;
  platform_fee_percent: number | null;
  creator_revenue_share_percent: number | null;
  status: CreatorEarningStatus;
  created_at: string;
};

export type CreatorEarningTransactionDetail = CreatorEarningTransactionRow & {
  calculationSnapshot: CreatorEarningCalculationSnapshot;
  contentLabel: string;
  sourceLabel: string;
  totalFeesVnd: number;
};

export type LedgerDirection = "credit" | "debit";

export type CreatorWalletLedgerRow = {
  id: string;
  creator_user_id: string;
  type: CreatorWalletLedgerType;
  amount_vnd: number;
  amount_coin: number | null;
  direction: LedgerDirection;
  source_type: string | null;
  source_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  withdrawal_request_id: string | null;
  transaction_id: string | null;
  earning_transaction_id: string | null;
  balance_type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type FinanceSecurityEventType =
  | "withdrawal_pin_set"
  | "withdrawal_pin_changed"
  | "withdrawal_pin_failed"
  | "withdrawal_pin_reset"
  | "payout_profile_created"
  | "payout_profile_changed"
  | "payout_verification_requested"
  | "payout_verification_completed"
  | "payout_bank_change_locked"
  | "bank_account_added"
  | "bank_account_updated"
  | "bank_account_deleted"
  | "bank_account_default_set"
  | "bank_account_email_verified"
  | "finance_email_code_sent"
  | "withdrawal_requested"
  | "withdrawal_canceled";

export type PayoutVerificationStatus =
  | "none"
  | "pending_email"
  | "verified"
  | "needs_reverification"
  | "rejected";

export type FinancePinStatus = "not_set" | "set" | "locked_temp";

export type PayoutLockReason =
  | "bank_account_changed"
  | "pin_failed_too_many_times"
  | "admin_manual";

export type FinanceEmailCodePurpose =
  | "setup_pin"
  | "change_pin"
  | "reset_pin"
  | "verify_payout"
  | "change_bank_account"
  | "verify_bank_account"
  | "withdrawal_request";

export type CreatorPayoutProfileView = {
  userId: string;
  legalName: string | null;
  verificationEmail: string | null;
  verificationStatus: PayoutVerificationStatus;
  verifiedAt: string | null;
  needsReverificationReason: string | null;
  lastBankChangeAt: string | null;
  withdrawalLockedUntil: string | null;
  withdrawalLockReason: PayoutLockReason | null;
  defaultPayoutAccountId: string | null;
};

export type FinanceIdentityStatus = {
  status: "unverified" | "pending" | "verified" | "rejected";
  verifiedName: string | null;
  canWithdraw: boolean;
  ctaLabel: string;
  ctaHref: string;
  description: string;
};

export type BankAccountStatus =
  | "pending_email"
  | "verified"
  | "locked_24h"
  | "locked_by_admin"
  | "pending_identity";

export type IdentityNameMatchStatus = "unknown" | "matched" | "mismatched";

export type BankAccountView = {
  id: string;
  bankName: string;
  accountNumberMasked: string | null;
  accountNumberDisplay: string;
  accountHolderName: string;
  branchNote: string | null;
  isDefault: boolean;
  emailVerifiedAt: string | null;
  accountStatus: BankAccountStatus;
  identityNameMatchStatus: IdentityNameMatchStatus;
  withdrawalLockedUntil: string | null;
  lockRemainingLabel: string | null;
  canUseForWithdrawal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinanceWithdrawalChecklistItem = {
  id: string;
  label: string;
  met: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaAction?: "add-bank" | "setup-pin";
};

export type StudioFinanceEligibility = {
  withdrawalDisabledByAdmin: boolean;
  identityVerified: boolean;
  hasWithdrawableBankAccount: boolean;
  pinReady: boolean;
  minBalanceMet: boolean;
  pinStatus: FinancePinStatus;
  checklist: FinanceWithdrawalChecklistItem[];
  blockReasons: string[];
  canWithdraw: boolean;
  primaryBlockReason: string | null;
  /** @deprecated use identityVerified */
  payoutVerified?: boolean;
  /** @deprecated */
  bankNameMatchesLegal?: boolean;
  /** @deprecated */
  payoutLockActive?: boolean;
  payoutLockUntil?: string | null;
  payoutLockReason?: PayoutLockReason | null;
};

export type FinanceSecurityLogRow = {
  id: string;
  creator_user_id: string;
  event_type: FinanceSecurityEventType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreatorFinanceConfigView = {
  creatorMonetizationEnabled: boolean;
  withdrawalsEnabled: boolean;
  withdrawalPinRequired: boolean;
  withdrawalReviewRequired: boolean;
  minWithdrawAmountVnd: number;
  coinToVndRate: number;
  creatorRevenueSharePercent: number;
  platformFeePercent: number;
  payoutProcessingDaysLabel: string;
  payoutMethodsEnabled: PayoutMethod[];
  coinDisplayName: string;
  policyNote: string;
};

export type CreatorFinanceBalance = {
  availableBalanceVnd: number;
  pendingBalanceVnd: number;
  lockedBalanceVnd: number;
  totalEarnedVnd: number;
  totalWithdrawnVnd: number;
  monthEarningsVnd: number;
  ledgerCreditsVnd: number;
  ledgerDebitsVnd: number;
  ledgerHoldsVnd: number;
  totalGrossRevenueVnd: number;
  totalFeesDeductedVnd: number;
  totalNetReceivedVnd: number;
  pendingWithdrawalVnd: number;
};

export type EarningsPeriodFilter = "7d" | "30d" | "90d" | "all";

export type EarningsBreakdownRow = {
  id: string;
  createdAt: string;
  contentLabel: string;
  sourceLabel: string;
  grossVnd: number;
  platformFeeVnd: number;
  paymentProcessingFeeVnd: number;
  taxOrAdjustmentVnd: number;
  totalFeesVnd: number;
  creatorNetVnd: number;
  status: string;
  storyId: string | null;
  chapterId: string | null;
  coinAmount: number | null;
};

export type WithdrawalStatusUi =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed"
  | "canceled";

export type WithdrawalHistoryRow = {
  id: string;
  amountVnd: number;
  method: PayoutMethod;
  methodLabel: string;
  payoutMasked: string;
  status: WithdrawalStatusUi;
  statusLabel: string;
  requestedAt: string;
  processedAt: string | null;
  adminNote: string | null;
  creatorNote: string | null;
  rawStatus: PayoutRequestStatus;
};

export type StudioFinancePageData = {
  config: CreatorFinanceConfigView;
  balance: CreatorFinanceBalance;
  wallet: CreatorWallet | null;
  earningsRows: EarningsBreakdownRow[];
  earningsFilter: EarningsPeriodFilter;
  ledgerRows: CreatorWalletLedgerRow[];
  withdrawalHistory: WithdrawalHistoryRow[];
  securityLogs: FinanceSecurityLogRow[];
  pinConfigured: boolean;
  pinLocked: boolean;
  pinLockedUntil: string | null;
  payoutsEnabled: boolean;
  canWithdraw: boolean;
  withdrawBlockReason: string | null;
  payoutProfile: CreatorPayoutProfileView | null;
  userEmail: string | null;
  identity: FinanceIdentityStatus;
  bankAccounts: BankAccountView[];
  eligibility: StudioFinanceEligibility;
  error: string | null;
};
