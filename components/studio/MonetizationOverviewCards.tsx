import type { StudioMonetizationConfigView, StudioMonetizationOverview } from "@/types/studio-monetization";

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

type MonetizationOverviewCardsProps = {
  overview: StudioMonetizationOverview;
  config: StudioMonetizationConfigView;
};

export function MonetizationOverviewCards({
  overview,
  config
}: MonetizationOverviewCardsProps) {
  const cards = [
    {
      label: "Có thể rút",
      value: overview.hasWallet
        ? formatVnd(overview.availableRevenueVnd)
        : "Chưa có dữ liệu"
    },
    {
      label: "Đang chờ đối soát",
      value: overview.hasWallet
        ? formatVnd(overview.pendingRevenueVnd)
        : "Chưa có dữ liệu"
    },
    {
      label: "Tổng doanh thu",
      value: overview.hasWallet
        ? formatVnd(overview.totalEarnedVnd)
        : "Chưa có dữ liệu"
    },
    {
      label: "Tip nhận được",
      value: config.tipsEnabled
        ? formatVnd(overview.tipsReceivedVnd)
        : "—"
    },
    {
      label: "Lượt mở khóa trả phí",
      value: config.paidChaptersEnabled
        ? String(overview.paidUnlockCount)
        : "—"
    },
    {
      label: "Rút tối thiểu",
      value: config.payoutsEnabled
        ? formatVnd(config.minWithdrawAmountVnd)
        : "—"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <div
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          key={card.label}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {card.label}
          </p>
          <p className="mt-2 text-lg font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
