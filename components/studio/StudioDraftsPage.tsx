"use client";

import { StudioDraftsFilters } from "@/components/studio/drafts/StudioDraftsFilters";
import { StudioDraftsHeader } from "@/components/studio/drafts/StudioDraftsHeader";
import { StudioDraftsListSection } from "@/components/studio/drafts/StudioDraftsListSection";
import { StudioDraftsRecent } from "@/components/studio/drafts/StudioDraftsRecent";
import { StudioDraftsStats } from "@/components/studio/drafts/StudioDraftsStats";
import { StudioDraftsWarningBanner } from "@/components/studio/drafts/StudioDraftsWarningBanner";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type {
  DraftItem,
  DraftListPageSize,
  DraftSort,
  DraftStatusFilter,
  DraftTimeFilter,
  StudioDraftListFilter,
  StudioDraftStats
} from "@/types/drafts";

type StudioDraftsPageProps = {
  activeFilter: StudioDraftListFilter;
  activePageSize: DraftListPageSize;
  activeSort: DraftSort;
  activeStatus: DraftStatusFilter;
  activeTime: DraftTimeFilter;
  attentionDrafts: DraftItem[];
  counts: Record<StudioDraftListFilter, number>;
  drafts: DraftItem[];
  filteredIds: string[];
  hasActiveFilters: boolean;
  page: number;
  query: Record<string, string | undefined>;
  recentDrafts: DraftItem[];
  search: string;
  stats: StudioDraftStats;
  total: number;
  totalPages: number;
  writeChapterHref: string;
};

export function StudioDraftsPage({
  activeFilter,
  activePageSize,
  activeSort,
  activeStatus,
  activeTime,
  attentionDrafts,
  counts,
  drafts,
  filteredIds,
  hasActiveFilters,
  page,
  query,
  recentDrafts,
  search,
  stats,
  total,
  totalPages,
  writeChapterHref
}: StudioDraftsPageProps) {
  const basePath = studioPath("/drafts");
  const showFullEmpty = stats.total === 0 && !hasActiveFilters;

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-6">
      <StudioDraftsHeader
        basePath={basePath}
        staleCount={stats.stale}
        writeChapterHref={writeChapterHref}
      />

      {!showFullEmpty ? (
        <>
          <StudioDraftsStats basePath={basePath} stats={stats} />

          {stats.stale > 0 || attentionDrafts.length > 0 ? (
            <StudioDraftsWarningBanner
              attentionDrafts={attentionDrafts}
              basePath={basePath}
              staleCount={stats.stale}
            />
          ) : null}

          <StudioDraftsRecent drafts={recentDrafts} />
        </>
      ) : null}

      {!showFullEmpty ? (
        <StudioDraftsFilters
          activeFilter={activeFilter}
          activePageSize={activePageSize}
          activeSort={activeSort}
          activeStatus={activeStatus}
          activeTime={activeTime}
          basePath={basePath}
          counts={counts}
          query={query}
          search={search}
        />
      ) : null}

      <StudioDraftsListSection
        drafts={drafts}
        filteredIds={filteredIds}
        hasActiveFilters={hasActiveFilters}
        page={page}
        pageSize={activePageSize}
        total={total}
      />

      {!showFullEmpty ? (
        <StudioPagination
          buildHref={(nextPage) =>
            buildStudioManagerHref(basePath, { ...query, page: String(nextPage) })
          }
          page={page}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}
