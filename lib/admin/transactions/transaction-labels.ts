import type { TransactionRiskReason } from "@/types/admin-transaction";
import type { TransactionSource, TransactionStatus, TransactionType } from "@/types/transaction";

export const TRANSACTION_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "coin_purchase", label: "Nạp coin" },
  { value: "chapter_purchase", label: "Mua chương" },
  { value: "author_tip", label: "Tip tác giả" },
  { value: "virtual_gift", label: "Quà tặng" },
  { value: "early_access", label: "Mở khóa sớm" },
  { value: "vip_subscription", label: "Gói VIP" },
  { value: "fan_club_subscription", label: "Fan club" },
  { value: "coin_reward", label: "Thưởng coin" },
  { value: "admin_coin_adjustment", label: "Admin điều chỉnh coin" },
  { value: "refund", label: "Hoàn coin" },
  { value: "payout", label: "Payout tác giả" },
  { value: "chargeback", label: "Chargeback" },
  { value: "platform_fee", label: "Phí nền tảng" }
];

export const TRANSACTION_STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "completed", label: "Thành công" },
  { value: "failed", label: "Thất bại" },
  { value: "refunded", label: "Đã hoàn" },
  { value: "partial_refund", label: "Hoàn một phần" },
  { value: "reversed", label: "Đã đảo giao dịch" },
  { value: "chargeback", label: "Chargeback" },
  { value: "needs_review", label: "Cần kiểm tra" }
];

export const TRANSACTION_SOURCE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "sepay", label: "SePay" },
  { value: "apple_iap", label: "Apple IAP" },
  { value: "google_play", label: "Google Play Billing" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "Hệ thống" },
  { value: "internal_wallet", label: "Ví nội bộ" }
];

export const TRANSACTION_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "amount_high", label: "Tiền VND cao → thấp" },
  { value: "amount_low", label: "Tiền VND thấp → cao" },
  { value: "coin_high", label: "Coin cao → thấp" },
  { value: "coin_low", label: "Coin thấp → cao" }
];

export const TRANSACTION_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  coin_purchase: "Nạp coin",
  chapter_unlock: "Mua chương",
  story_unlock: "Mở khóa truyện",
  author_tip: "Tip tác giả",
  virtual_gift: "Quà tặng",
  vip_subscription: "Gói VIP",
  fan_club_subscription: "Fan club",
  bonus_coin_grant: "Thưởng coin",
  rewarded_ad_coin: "Thưởng coin",
  admin_coin_adjustment: "Admin điều chỉnh coin",
  refund: "Hoàn coin",
  payout_request: "Payout tác giả",
  payout_completed: "Payout tác giả",
  platform_fee: "Phí nền tảng",
  reversal: "Đảo giao dịch",
  creator_revenue_share: "Doanh thu tác giả",
  creator_bonus: "Thưởng tác giả",
  fraud_hold: "Giữ do nghi ngờ",
  sponsored_campaign_revenue: "Doanh thu tài trợ"
};

const STATUS_LABELS: Partial<Record<TransactionStatus, string>> = {
  pending: "Chờ xử lý",
  completed: "Thành công",
  failed: "Thất bại",
  refunded: "Đã hoàn",
  cancelled: "Đã hủy",
  reversed: "Đã đảo giao dịch"
};

const SOURCE_LABELS: Partial<Record<TransactionSource, string>> = {
  system: "Hệ thống",
  payment: "Thanh toán",
  sepay: "SePay",
  tip: "Tip",
  unlock: "Mở khóa",
  vip: "VIP",
  gift: "Quà tặng",
  admin: "Admin",
  bonus: "Thưởng",
  rewarded_ad_coin: "Quảng cáo thưởng",
  payout: "Payout",
  refund: "Hoàn tiền",
  sponsor: "Tài trợ"
};

const RISK_LABELS: Record<TransactionRiskReason, string> = {
  manual_review: "Cần kiểm tra",
  large_amount: "Số tiền lớn",
  refund_chargeback: "Hoàn/chargeback",
  admin_adjustment: "Admin điều chỉnh",
  webhook_error: "Lỗi webhook",
  repeated_failure: "Thất bại lặp lại"
};

export function transactionTypeLabel(type: string) {
  return TYPE_LABELS[type as TransactionType] ?? type;
}

export function transactionStatusLabel(status: string) {
  return STATUS_LABELS[status as TransactionStatus] ?? status;
}

export function transactionSourceLabel(source: string, provider?: string | null) {
  if (provider === "apple_iap") return "Apple IAP";
  if (provider === "google_play") return "Google Play Billing";
  if (provider === "sepay" || source === "sepay") return "SePay";
  return SOURCE_LABELS[source as TransactionSource] ?? source;
}

export function transactionRiskLabel(reason: TransactionRiskReason) {
  return RISK_LABELS[reason];
}

export function formatShortTransactionCode(code: string) {
  if (code.length <= 22) return code;
  return `${code.slice(0, 20)}…`;
}

export function formatCoinAmount(amount: number | null, direction?: string) {
  if (amount == null || amount === 0) return "—";
  const prefix = direction === "debit" || amount < 0 ? "-" : "+";
  return `${prefix}${Math.abs(amount).toLocaleString("vi-VN")}`;
}

export function formatVndAmount(amount: number | null) {
  if (amount == null || amount === 0) return "—";
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "pending":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "failed":
      return "border-rose-400/30 bg-rose-400/10 text-rose-200";
    case "refunded":
    case "reversed":
    case "cancelled":
      return "border-violet-400/25 bg-violet-400/10 text-violet-200";
    default:
      return "border-white/15 bg-white/[0.04] text-zinc-300";
  }
}

export function sourceBadgeClass() {
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

export function riskBadgeClass() {
  return "border-orange-400/30 bg-orange-400/10 text-orange-200";
}
