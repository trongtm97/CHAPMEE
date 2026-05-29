import Link from "next/link";
import type { AdminFinanceOverview } from "@/types/admin";

type AdminFinanceWithdrawalOverviewProps = {
  overview: AdminFinanceOverview;
};

export function AdminFinanceWithdrawalOverview({
  overview
}: AdminFinanceWithdrawalOverviewProps) {
  const cards = [
    {
      label: "Yêu cầu rút đang chờ",
      value: String(overview.pendingWithdrawalCount)
    },
    {
      label: "Số tiền đang chờ duyệt",
      value: `${overview.pendingWithdrawalAmountVnd.toLocaleString("vi-VN")} ₫`
    },
    {
      label: "Đã thanh toán (tổng)",
      value: `${overview.completedWithdrawalAmountVnd.toLocaleString("vi-VN")} ₫`
    },
    {
      label: "Tác giả có doanh thu",
      value: String(overview.creatorsWithRevenueCount)
    }
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Rút tiền tác giả</h2>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin/withdrawals">
          Quản lý yêu cầu rút →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className="mt-1 text-lg font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>
      {overview.anomalyFlags.length > 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-sm font-semibold text-amber-100">Cảnh báo</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-100/90">
            {overview.anomalyFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
