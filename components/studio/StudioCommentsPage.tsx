"use client";

import { StudioCommentsFilters } from "@/components/studio/comments/StudioCommentsFilters";
import { StudioCommentsHeader } from "@/components/studio/comments/StudioCommentsHeader";
import { StudioCommentsListSection } from "@/components/studio/comments/StudioCommentsListSection";
import { RelatedStoryGroups } from "@/components/studio/comments/RelatedStoryGroups";
import { ErrorState } from "@/components/ui";
import { studioPath } from "@/lib/studio/constants";
import type {
  CommentListPageSize,
  StudioCommentFilter,
  StudioCommentSort,
  StudioCommentsPageData,
  StudioCommentTimeFilter
} from "@/types/comments";

type StudioCommentsPageProps = {
  activeFilter: StudioCommentFilter;
  activePageSize: CommentListPageSize;
  activeSort: StudioCommentSort;
  activeTime: StudioCommentTimeFilter;
  activeStoryId?: string;
  data: StudioCommentsPageData;
  query: Record<string, string | undefined>;
  searchQuery?: string;
};

export function StudioCommentsPage({
  activeFilter,
  activePageSize,
  activeSort,
  activeTime,
  activeStoryId,
  data,
  query,
  searchQuery = ""
}: StudioCommentsPageProps) {
  const basePath = studioPath("/comments");

  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được bình luận" />;
  }

  return (
    <div className="space-y-5 pb-28 sm:space-y-6 sm:pb-8">
      <StudioCommentsHeader stats={data.stats} />

      <StudioCommentsFilters
        activeFilter={activeFilter}
        activePageSize={activePageSize}
        activeSort={activeSort}
        activeTime={activeTime}
        basePath={basePath}
        counts={data.tabCounts}
        query={query}
        search={searchQuery}
        stories={data.stories}
        storyId={activeStoryId}
      />

      <StudioCommentsListSection
        basePath={basePath}
        comments={data.comments}
        filteredIds={data.filteredIds}
        hasActiveFilters={data.hasActiveFilters}
        hasStories={data.stories.length > 0}
        page={data.page}
        pageSize={data.pageSize}
        query={query}
        total={data.total}
        totalPages={data.totalPages}
      />

      <RelatedStoryGroups groups={data.storyGroups} />
    </div>
  );
}
