import type { UserCoinLedgerType, UserCoinType } from "@/types/coins";
import { formatXu } from "@/lib/format/money";

export const COIN_LEDGER_TYPE_LABELS: Record<UserCoinLedgerType, string> = {
  purchase: "Nạp Xu",
  spend_unlock_chapter: "Mở khóa chương",
  spend_unlock_story: "Mở khóa truyện",
  tip_sent: "Tip tác giả",
  admin_grant: "Admin tặng Xu",
  admin_debit: "Admin trừ Xu",
  promo_bonus: "Thưởng khuyến mãi",
  refund: "Hoàn Xu",
  adjustment: "Điều chỉnh"
};

export const COIN_TYPE_LABELS: Record<UserCoinType, string> = {
  paid: "Xu đã mua",
  bonus: "Xu thưởng",
  promo: "Xu khuyến mãi",
  admin_grant: "Xu admin tặng"
};

export function formatLedgerAmount(direction: "credit" | "debit", amount: number) {
  const prefix = direction === "credit" ? "+" : "-";
  return `${prefix}${formatXu(amount)}`;
}
