import type { CreatorFinanceBalance, CreatorFinanceConfigView } from "@/types/finance";

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

type FinanceOverviewCardsProps = {
  balance: CreatorFinanceBalance;
  config: CreatorFinanceConfigView;
};

export function FinanceOverviewCards({ balance, config }: FinanceOverviewCardsProps) {
  const cards = [
    {
      label: "Số dư có thể rút",
      value: formatVnd(balance.availableBalanceVnd),
      highlight: true
    },
    { label: "Doanh thu gộp", value: formatVnd(balance.totalGrossRevenueVnd) },
    { label: "Phí đã trừ", value: formatVnd(balance.totalFeesDeductedVnd) },
    { label: "Tác giả thực nhận", value: formatVnd(balance.totalNetReceivedVnd) },
    { label: "Đang chờ rút", value: formatVnd(balance.pendingWithdrawalVnd) },
    { label: "Đã rút", value: formatVnd(balance.totalWithdrawnVnd) },
    { label: "Đang đối soát", value: formatVnd(balance.pendingBalanceVnd) },
    { label: "Đang giữ (rủi ro)", value: formatVnd(balance.lockedBalanceVnd) },
    { label: "Doanh thu tháng này (NET)", value: formatVnd(balance.monthEarningsVnd) }
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Số dư ví là số tiền thực nhận sau khi đã trừ các khoản phí theo chính sách ChapMee.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border px-4 py-3 ${
              card.highlight
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-white/10 bg-zinc-950/60"
            }`}
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p
              className={`mt-1 text-lg font-bold ${
                card.highlight ? "text-emerald-100" : "text-white"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 px-4 py-3 sm:col-span-2 lg:col-span-3">
          <p className="text-xs text-sky-200/80">Rút tối thiểu</p>
          <p className="mt-1 text-sm text-sky-100">
            {config.withdrawalsEnabled
              ? formatVnd(config.minWithdrawAmountVnd)
              : "Chưa bật rút tiền"}
            {config.withdrawalReviewRequired
              ? " · Yêu cầu rút cần được kiểm tra trước khi thanh toán."
              : null}
          </p>
        </div>
      </div>
    </div>
  );
}
