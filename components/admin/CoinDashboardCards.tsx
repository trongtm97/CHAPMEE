import { Card } from "@/components/ui";
import type { AdminCoinDashboardMetrics } from "@/types/coins";

type CoinDashboardCardsProps = {
  metrics: AdminCoinDashboardMetrics;
};

const CARDS: Array<{
  key: keyof AdminCoinDashboardMetrics;
  label: string;
}> = [
  { key: "totalPaidCoinInCirculation", label: "Coin nạp lưu hành" },
  { key: "totalBonusCoinInCirculation", label: "Coin thưởng lưu hành" },
  { key: "coinSoldToday", label: "Bán hôm nay" },
  { key: "coinSpentToday", label: "Chi tiêu hôm nay" },
  { key: "bonusGrantedToday", label: "Thưởng cấp hôm nay" },
  { key: "coinTransactionsToday", label: "Giao dịch hôm nay" },
  { key: "adminAdjustmentsToday", label: "Admin điều chỉnh hôm nay" },
  { key: "coinRiskAlerts", label: "Cảnh báo rủi ro mở" }
];

export function CoinDashboardCards({ metrics }: CoinDashboardCardsProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <Card className="py-2.5" key={card.key}>
          <p className="text-[11px] leading-tight text-zinc-500">{card.label}</p>
          <p className="mt-0.5 text-lg font-bold text-white">
            {metrics[card.key].toLocaleString("vi-VN")}
          </p>
        </Card>
      ))}
    </div>
  );
}
