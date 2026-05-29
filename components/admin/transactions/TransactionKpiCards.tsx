"use client";

import type { TransactionKpiSummary } from "@/types/admin-transaction";

type Props = {
  summary: TransactionKpiSummary;
  onFilterNeedsReview?: () => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function TransactionKpiCards({ summary, onFilterNeedsReview }: Props) {
  const cards = [
    { key: "total", label: "Tổng giao dịch", value: formatNumber(summary.totalTransactions) },
    {
      key: "deposited",
      label: "Tổng coin đã nạp",
      value: formatNumber(summary.totalCoinDeposited)
    },
    { key: "spent", label: "Tổng coin đã tiêu", value: formatNumber(summary.totalCoinSpent) },
    {
      key: "review",
      label: "Giao dịch cần kiểm tra",
      value: formatNumber(summary.needsReviewCount),
      onClick: onFilterNeedsReview
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => (
        <button
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left transition hover:border-cyan-400/30 disabled:cursor-default"
          disabled={!card.onClick}
          key={card.key}
          onClick={card.onClick}
          type="button"
        >
          <p className="text-xl font-bold text-white">{card.value}</p>
          <p className="mt-1 text-[11px] leading-tight text-zinc-400">{card.label}</p>
        </button>
      ))}
    </div>
  );
}
