"use client";

import type { AdminContentQualitySummary } from "@/types/admin";

type ContentQualitySummaryCardsProps = {
  summary: AdminContentQualitySummary;
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
};

const cards: Array<{
  key: keyof AdminContentQualitySummary;
  label: string;
  filter: string | null;
}> = [
  { key: "pendingReview", label: "Cần xét duyệt", filter: "pending_review" },
  { key: "waitingAuthor", label: "Chờ tác giả sửa", filter: "waiting_author" },
  { key: "appealing", label: "Đang khiếu nại", filter: "appealing" },
  { key: "atRisk", label: "Nguy cơ ẩn vĩnh viễn", filter: "at_risk" },
  { key: "restored", label: "Đã khôi phục", filter: "restored" },
  { key: "permanentlyHidden", label: "Đã ẩn vĩnh viễn", filter: "permanently_hidden" },
  { key: "monetizationDisabled", label: "Đã tắt kiếm tiền", filter: "monetization" },
  { key: "processedToday", label: "Đã xử lý hôm nay", filter: null }
];

export function ContentQualitySummaryCards({
  summary,
  activeFilter,
  onFilter
}: ContentQualitySummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
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
