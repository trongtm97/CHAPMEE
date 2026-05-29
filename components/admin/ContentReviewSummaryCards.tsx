"use client";

import type { ContentReviewSummary } from "@/types/admin-content-review";

type ContentReviewSummaryCardsProps = {
  summary: ContentReviewSummary;
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
};

const cards: Array<{
  key: keyof ContentReviewSummary | "reports";
  label: string;
  filter: string | null;
}> = [
  { key: "pendingStories", label: "Truyện chờ duyệt", filter: "story" },
  { key: "pendingEpisodes", label: "Chương chờ duyệt", filter: "episode" },
  { key: "pendingCommunityPosts", label: "Bài cộng đồng chờ duyệt", filter: "community" },
  { key: "reportedComments", label: "Bình luận bị báo cáo", filter: "reports" },
  { key: "processedToday", label: "Đã xử lý hôm nay", filter: "processed" },
  { key: "rejectedToday", label: "Bị từ chối hôm nay", filter: null }
];

export function ContentReviewSummaryCards({
  summary,
  activeFilter,
  onFilter
}: ContentReviewSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const value =
          card.key === "reports"
            ? summary.reportedComments
            : summary[card.key as keyof ContentReviewSummary];
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
