"use client";

import { EmptyState, ErrorState, SectionHeader } from "@/components/ui";
import { StoryRankingCard } from "@/components/rankings/StoryRankingCard";
import { AuthorRankingCard } from "@/components/rankings/AuthorRankingCard";
import { FanRankingCard } from "@/components/rankings/FanRankingCard";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { useRankings } from "@/hooks/useRankings";
import {
  RANKING_TABS,
  TIME_PERIODS,
  type RankingCategory
} from "@/types/ranking";

export function RankingTabs() {
  const {
    activeTab,
    setActiveTab,
    timePeriod,
    setTimePeriod,
    data,
    loading,
    error
  } = useRankings();

  const currentTabMeta = RANKING_TABS.find((t) => t.id === activeTab);

  return (
    <div className="space-y-6">
      <section>
        <p className="page-kicker">Bảng xếp hạng</p>
        <h1 className="page-title">Ai đang dẫn đầu?</h1>
        <p className="page-copy">
          Khám phá truyện hot, truyện mới nổi, tác giả nổi bật và Top Fan đang
          tạo nhịp cho ChapMee.
        </p>
      </section>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-1">
          {RANKING_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                className={`tap-highlight whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200 shadow-[0_0_0_1px_rgba(125,211,252,0.14)]"
                    : "border-white/10 bg-[var(--surface)] text-zinc-300 hover:border-white/20 hover:bg-[var(--surface-soft)]"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIME_PERIODS.filter(
          (period) => activeTab !== "top_fans" || period.id === "all"
        ).map((period) => {
          const active = timePeriod === period.id;
          return (
            <button
              className={`tap-highlight rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
              }`}
              key={period.id}
              onClick={() => setTimePeriod(period.id)}
              type="button"
            >
              {period.label}
            </button>
          );
        })}
      </div>

      {currentTabMeta && (
        <SectionHeader
          subtitle={currentTabMeta.description}
          title={currentTabMeta.label}
        />
      )}

      {error ? (
        <ErrorState
          message={error}
          title="Không tải được bảng xếp hạng"
          variant="warning"
        />
      ) : loading ? (
        <RankingSkeleton count={5} />
      ) : (
        <RankingList
          activeTab={activeTab}
          data={data}
          currentTabMeta={currentTabMeta}
        />
      )}
    </div>
  );
}

type RankingListProps = {
  activeTab: RankingCategory;
  data: ReturnType<typeof useRankings>["data"];
  currentTabMeta: (typeof RANKING_TABS)[number] | undefined;
};

function RankingList({ activeTab, data, currentTabMeta }: RankingListProps) {
  switch (activeTab) {
    case "hot_stories":
      return renderList(
        data.hotStories,
        currentTabMeta,
        (item) => (
          <StoryRankingCard item={item} key={item.id} />
        )
      );

    case "rising_stories":
      return renderList(
        data.risingStories,
        currentTabMeta,
        (item) => (
          <StoryRankingCard item={item} key={item.id} />
        )
      );

    case "top_authors":
      return renderList(
        data.topAuthors,
        currentTabMeta,
        (item) => (
          <AuthorRankingCard item={item} key={item.id} />
        )
      );

    case "top_fans":
      return renderList(
        data.topFans,
        currentTabMeta,
        (item) => (
          <FanRankingCard item={item} key={item.id} />
        )
      );

    default:
      return null;
  }
}

function renderList<T>(
  items: T[],
  currentTabMeta: (typeof RANKING_TABS)[number] | undefined,
  renderItem: (item: T) => React.ReactNode
) {
  if (items.length === 0) {
    return (
      <EmptyState
        description={
          currentTabMeta?.emptyDescription ?? "Chưa có dữ liệu cho bảng xếp hạng này."
        }
        title={currentTabMeta?.emptyTitle ?? "Chưa có dữ liệu"}
      />
    );
  }

  return <div className="space-y-3">{items.map(renderItem)}</div>;
}
