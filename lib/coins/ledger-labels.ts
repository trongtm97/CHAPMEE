import type { UserCoinLedgerType, UserCoinType } from "@/types/coins";

export const COIN_LEDGER_TYPE_LABELS: Record<UserCoinLedgerType, string> = {
  purchase: "Nạp coin",
  spend_unlock_chapter: "Mở khóa chương",
  spend_unlock_story: "Mở khóa truyện",
  tip_sent: "Tip tác giả",
  admin_grant: "Admin tặng coin",
  admin_debit: "Admin trừ coin",
  promo_bonus: "Thưởng khuyến mãi",
  refund: "Hoàn coin",
  adjustment: "Điều chỉnh"
};

export const COIN_TYPE_LABELS: Record<UserCoinType, string> = {
  paid: "Coin đã mua",
  bonus: "Coin thưởng",
  promo: "Coin khuyến mãi",
  admin_grant: "Coin admin tặng"
};

export function formatLedgerAmount(direction: "credit" | "debit", amount: number) {
  const prefix = direction === "credit" ? "+" : "-";
  return `${prefix}${amount.toLocaleString("vi-VN")} coin`;
}
