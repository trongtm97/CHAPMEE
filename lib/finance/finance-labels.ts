import type { TransactionStatus, TransactionType } from "@/types/transaction";

export const REVENUE_SOURCE_LABELS: Record<string, string> = {
  coin_purchase: "Nạp coin",
  author_tip: "Tip tác giả",
  virtual_gift: "Quà tặng ảo",
  chapter_unlock: "Mở khóa chương",
  early_access_unlock: "Đọc sớm",
  vip_subscription: "Gói VIP",
  fan_club_subscription: "Fan club",
  rewarded_ads: "Quảng cáo thưởng",
  sponsored_challenge: "Tài trợ thử thách",
  platform_fee: "Phí nền tảng"
};

export const TRANSACTION_TYPE_LABELS: Partial<Record<TransactionType, string>> = {
  coin_purchase: "Nạp coin",
  chapter_unlock: "Mở khóa chương",
  story_unlock: "Mở khóa truyện",
  author_tip: "Tip tác giả",
  virtual_gift: "Quà tặng",
  refund: "Hoàn tiền",
  payout_request: "Rút tiền",
  payout_completed: "Rút tiền",
  admin_coin_adjustment: "Admin điều chỉnh coin",
  bonus_coin_grant: "Admin cộng coin"
};

export const TRANSACTION_STATUS_LABELS: Partial<Record<TransactionStatus, string>> = {
  pending: "Đang chờ",
  completed: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn",
  cancelled: "Đã hủy",
  reversed: "Đã đảo"
};

export function transactionTypeLabel(type: string) {
  return TRANSACTION_TYPE_LABELS[type as TransactionType] ?? type;
}

export function transactionStatusLabel(status: string) {
  return TRANSACTION_STATUS_LABELS[status as TransactionStatus] ?? status;
}

export function revenueSourceLabel(source: string) {
  return REVENUE_SOURCE_LABELS[source] ?? source;
}
