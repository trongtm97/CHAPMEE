"use client";

import type { ReportSummary } from "@/types/reports";

type ReportSummaryCardsProps = {
  summary: ReportSummary;
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
};

const cards: Array<{
  key: keyof ReportSummary;
  label: string;
  filter: string | null;
}> = [
  { key: "pending", label: "Báo cáo mới", filter: "pending" },
  { key: "reviewing", label: "Đang xử lý", filter: "reviewing" },
  { key: "highSeverity", label: "Mức độ cao", filter: "high" },
  { key: "messageReports", label: "Báo cáo tin nhắn", filter: "message" },
  { key: "contentReports", label: "Báo cáo nội dung", filter: "content" },
  { key: "resolvedToday", label: "Đã xử lý hôm nay", filter: "resolved_today" }
];

export function ReportSummaryCards({
  summary,
  activeFilter,
  onFilter
}: ReportSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const value = summary[card.key];
        const isActive = activeFilter === card.filter;
        const clickable = card.filter != null;

        return (
          <button
            className={`rounded-xl border p-3 text-left transition ${
              isActive
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-white/10 bg-zinc-900/40 hover:border-white/20"
            } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            disabled={!clickable}
            key={card.label}
            onClick={() => clickable && onFilter(card.filter)}
            type="button"
          >
            <p
              className={`text-2xl font-bold tabular-nums ${
                Number(value) > 0 ? "text-white" : "text-zinc-500"
              }`}
            >
              {value}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-400">{card.label}</p>
          </button>
        );
      })}
    </div>
  );
}
