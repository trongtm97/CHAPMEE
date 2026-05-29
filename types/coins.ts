export const USER_COIN_LEDGER_TYPES = [
  "purchase",
  "spend_unlock_chapter",
  "spend_unlock_story",
  "tip_sent",
  "admin_grant",
  "admin_debit",
  "promo_bonus",
  "refund",
  "adjustment"
] as const;

export type UserCoinLedgerType = (typeof USER_COIN_LEDGER_TYPES)[number];

export const USER_COIN_TYPES = ["paid", "bonus", "promo", "admin_grant"] as const;

export type UserCoinType = (typeof USER_COIN_TYPES)[number];

export type UserCoinLedgerEntry = {
  id: string;
  userId: string;
  type: UserCoinLedgerType;
  direction: "credit" | "debit";
  coinAmount: number;
  coinType: UserCoinType;
  sourceType: string | null;
  sourceId: string | null;
  adminId: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type UserCoinBalanceSummary = {
  totalCredit: number;
  totalDebit: number;
  balance: number;
  paidCredit: number;
  bonusCredit: number;
  walletPaid: number;
  walletBonus: number;
  walletTotal: number;
};

export type AdminCoinDebitInput = {
  userId: string;
  amount: number;
  coinType: "paid" | "bonus";
  reason: string;
  reasonCode?: string | null;
  adminNote?: string | null;
  referenceId?: string | null;
  dangerConfirmToken?: string | null;
  allowNegative?: boolean;
};

export const ADMIN_COIN_REASON_CODES = [
  "boi_hoan_loi_he_thong",
  "boi_hoan_thanh_toan",
  "khuyen_mai",
  "thuong_su_kien",
  "cham_soc_khach_hang",
  "thu_hoi_gian_lan",
  "dieu_chinh_sai_lech",
  "test_noi_bo",
  "khac"
] as const;

export type AdminCoinReasonCode = (typeof ADMIN_COIN_REASON_CODES)[number];

export const BULK_COIN_REASON_CODES = ADMIN_COIN_REASON_CODES;

export type BulkCoinReasonCode = AdminCoinReasonCode;

export type AdminCoinAdjustmentDirection = "credit" | "debit";

export type AdminCoinAdjustInput = {
  userId: string;
  direction: AdminCoinAdjustmentDirection;
  amount: number;
  coinType: "paid" | "bonus";
  reasonCode: AdminCoinReasonCode;
  reason: string;
  adminNote?: string | null;
  referenceId?: string | null;
  confirmedUser?: boolean;
  dangerConfirmToken?: string | null;
};

export type AdminCoinDashboardMetrics = {
  totalPaidCoinInCirculation: number;
  totalBonusCoinInCirculation: number;
  coinSoldToday: number;
  coinSpentToday: number;
  bonusGrantedToday: number;
  coinTransactionsToday: number;
  adminAdjustmentsToday: number;
  coinRiskAlerts: number;
};

export type CoinAdminUserRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  status: string;
  paidCoin: number;
  bonusCoin: number;
  totalCoin: number;
};

export type UserCoinWalletDetail = UserCoinBalanceSummary & {
  totalPurchased: number;
  totalBonusReceived: number;
  totalSpent: number;
  totalRevoked: number;
  /** @deprecated dùng totalBonusReceived */
  totalGifted: number;
  /** @deprecated dùng totalRevoked */
  totalRefundedOrDebited: number;
};

export type AdminCoinAdjustmentHistoryEntry = {
  id: string;
  createdAt: string;
  userId: string;
  userLabel: string;
  coinType: "paid" | "bonus";
  direction: "credit" | "debit";
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  reason: string;
  reasonCode: string | null;
  adminId: string | null;
  adminLabel: string;
  referenceId: string | null;
  source: string;
  sourceLabel: string;
  status: string;
  transactionId: string | null;
};

export type AdminCoinAdjustmentHistoryFilters = {
  coinType?: "all" | "paid" | "bonus";
  direction?: "all" | "credit" | "debit";
  source?:
    | "all"
    | "admin_adjustment"
    | "bulk_admin_adjustment"
    | "refund"
    | "purchase"
    | "spend"
    | "system";
  adminId?: string;
  userId?: string;
  userQuery?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: 25 | 50 | 100;
};

export type BulkCoinValidateResult = {
  lines: BulkCoinLinePreview[];
  error: string | null;
  totals: { paid: number; bonus: number };
  hasPaidCoin: boolean;
};

export type BulkCoinLinePreview = {
  line: number;
  raw: string;
  usernameOrEmail: string;
  userId: string | null;
  userLabel: string | null;
  coinType: "paid" | "bonus" | null;
  amount: number | null;
  reasonCode: string | null;
  valid: boolean;
  error: string | null;
};

export type AdminCoinGrantInput = {
  userId: string;
  amount: number;
  coinType: "paid" | "bonus";
  reason: string;
  reasonCode?: string | null;
  adminNote?: string | null;
  referenceId?: string | null;
  bulkAdminAdjustment?: boolean;
  dangerConfirmToken?: string | null;
};
