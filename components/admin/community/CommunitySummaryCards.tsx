"use client";

import type { CommunityAdminSummary } from "@/types/community-admin";

type CommunitySummaryCardsProps = {
  summary: CommunityAdminSummary;
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
};

const cards: Array<{
  key: keyof CommunityAdminSummary;
  label: string;
  filter: string | null;
}> = [
  { key: "pendingPosts", label: "Bài chờ duyệt", filter: "pending_posts" },
  { key: "reportedComments", label: "Bình luận bị báo cáo", filter: "comments" },
  { key: "activePolls", label: "Poll đang hoạt động", filter: "polls" },
  { key: "activeChallenges", label: "Challenge đang chạy", filter: "challenges" },
  { key: "hotStoryGroups", label: "Nhóm truyện đang hot", filter: "story_groups" },
  { key: "reportedPosts", label: "Bài bị report", filter: "reported_posts" },
  { key: "hiddenToday", label: "Bài đã ẩn hôm nay", filter: "hidden_today" },
  { key: "processedToday", label: "Đã xử lý hôm nay", filter: "processed" }
];

export function CommunitySummaryCards({
  summary,
  activeFilter,
  onFilter
}: CommunitySummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const value = summary[card.key];
        const isActive = activeFilter === card.filter;

        return (
          <button
            className={`rounded-xl border p-3 text-left transition ${
              isActive
                ? "border-cyan-400/50 bg-cyan-500/10"
                : "border-white/10 bg-zinc-900/40 hover:border-white/20"
            }`}
            key={card.label}
            onClick={() => onFilter(isActive ? null : card.filter)}
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
