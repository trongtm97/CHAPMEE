"use client";

import { useState } from "react";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioReelsCreateDrawer } from "@/components/studio/reels/management/StudioReelsCreateDrawer";
import { StudioReelsFilters } from "@/components/studio/reels/management/StudioReelsFilters";
import { StudioReelsHeader } from "@/components/studio/reels/management/StudioReelsHeader";
import { StudioReelsListSection } from "@/components/studio/reels/management/StudioReelsListSection";
import { StudioReelsStats } from "@/components/studio/reels/management/StudioReelsStats";
import { StudioReelsTodayPanel } from "@/components/studio/reels/management/StudioReelsTodayPanel";
import { studioPath } from "@/lib/studio/constants";
import type { ReelsGenreOption, ReelsStoryOption } from "@/lib/reels/get-studio-reels-page";
import type {
  ReelsListPageSize,
  ReelsListSort,
  ReelsListTab,
  ReelsSourceFilter,
  ReelsStudioListItem,
  ReelsStudioStats,
  ReelsTaskItem,
  ReelsTimeFilter
} from "@/types/reels";

const TABS: Array<{ label: string; value: ReelsListTab }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Đang đăng", value: "published" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Cần sửa", value: "needs_fix" }
];

type StoryOption = {
  id: string;
  title: string;
  slug: string;
};

export type StudioReelsPageProps = {
  activeGenreId: string;
  activeSort: ReelsListSort;
  activeSource: ReelsSourceFilter;
  activeStoryId: string;
  activeTab: ReelsListTab;
  activeTime: ReelsTimeFilter;
  allTasks: ReelsTaskItem[];
  authorName: string;
  counts: Record<ReelsListTab, number>;
  dateFrom: string;
  dateTo: string;
  filteredIds: string[];
  genreOptions: ReelsGenreOption[];
  hasActiveFilters: boolean;
  items: ReelsStudioListItem[];
  page: number;
  pageSize: ReelsListPageSize;
  query: Record<string, string | undefined>;
  search: string;
  stats: ReelsStudioStats;
  stories: StoryOption[];
  storyOptions: ReelsStoryOption[];
  total: number;
  totalPages: number;
};

export function StudioReelsPage({
  activeGenreId,
  activeSort,
  activeSource,
  activeStoryId,
  activeTab,
  activeTime,
  allTasks,
  authorName,
  counts,
  dateFrom,
  dateTo,
  filteredIds,
  genreOptions,
  hasActiveFilters,
  items,
  page,
  pageSize,
  query,
  search,
  stats,
  stories,
  storyOptions,
  total,
  totalPages
}: StudioReelsPageProps) {
  const basePath = studioPath("/reels");
  const [createOpen, setCreateOpen] = useState(false);
  const showGlobalEmpty = stats.total === 0 && !hasActiveFilters;

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-6">
      <StudioReelsHeader onCreateClick={() => setCreateOpen(true)} stats={stats} />

      {!showGlobalEmpty ? (
        <>
          <StudioReelsStats basePath={basePath} stats={stats} />
          <StudioReelsTodayPanel allTasks={allTasks} basePath={basePath} />
          <StudioReelsFilters
            activeGenreId={activeGenreId}
            activeSort={activeSort}
            activeSource={activeSource}
            activeStoryId={activeStoryId}
            activeTab={activeTab}
            activeTime={activeTime}
            basePath={basePath}
            dateFrom={dateFrom}
            dateTo={dateTo}
            genreOptions={genreOptions}
            pageSize={pageSize}
            search={search}
            storyOptions={storyOptions}
          />
          <StudioManagerTabs
            active={activeTab}
            basePath={basePath}
            counts={counts}
            filterParam="tab"
            query={query}
            tabs={TABS}
          />
        </>
      ) : null}

      <StudioReelsListSection
        authorName={authorName}
        filteredIds={filteredIds}
        hasActiveFilters={hasActiveFilters}
        items={showGlobalEmpty ? [] : items}
        onCreateClick={() => setCreateOpen(true)}
        page={page}
        pageSize={pageSize}
        query={query}
        total={total}
        totalPages={totalPages}
      />

      <StudioReelsCreateDrawer
        authorName={authorName}
        onClose={() => setCreateOpen(false)}
        open={createOpen}
        stories={stories}
      />
    </div>
  );
}
