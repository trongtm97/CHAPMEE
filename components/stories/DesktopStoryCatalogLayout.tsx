import { CatalogDesktopFilterRail } from "@/components/stories/CatalogDesktopFilterRail";
import { StoryCatalogFilters } from "@/components/stories/StoryCatalogFilters";
import { StoryCatalogGrid } from "@/components/stories/StoryCatalogGrid";
import { StoryCatalogSummary } from "@/components/stories/StoryCatalogSummary";
import { StoryPagination } from "@/components/stories/StoryPagination";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";

export type StoryCatalogLayoutProps = {
  stories: StoryCatalogStory[];
  genres: StoryCatalogGenre[];
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  filters: StoryCatalogFilterParams;
  filterOptions: CatalogFilterOptions;
  hideCatalogHeader?: boolean;
  trackingContext?: StoryCatalogTrackingContext;
};

export function DesktopStoryCatalogLayout({
  genre,
  genres,
  hideCatalogHeader = false,
  filters,
  filterOptions,
  page,
  pageSize,
  query,
  sort,
  status,
  stories,
  totalCount,
  totalPages,
  trackingContext
}: StoryCatalogLayoutProps) {
  const trackingSurface = query.trim() ? "search" : "category";

  return (
    <div className="hidden space-y-4 pb-2 lg:block">
      {hideCatalogHeader ? null : (
        <header className="space-y-1">
          <p className="page-kicker">Khám phá</p>
          <h1 className="page-title !mt-2 !text-[2rem]">Danh mục truyện</h1>
        </header>
      )}

      <StoryCatalogFilters
        featuredGenreSlugs={filterOptions.featuredGenreSlugs}
        filterOptions={filterOptions}
        filters={filters}
        genre={genre}
        genres={genres}
        query={query}
        sort={sort}
        status={status}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <CatalogDesktopFilterRail
          filterOptions={filterOptions}
          filters={filters}
          genre={genre}
          query={query}
        />

        <div className="min-w-0 space-y-4">
          <StoryCatalogSummary page={page} totalCount={totalCount} totalPages={totalPages} />

          <StoryCatalogGrid
            stories={stories}
            trackingContext={trackingContext}
            trackingSurface={trackingSurface}
          />

          <StoryPagination
            filters={filters}
            genre={genre}
            layout="desktop"
            page={page}
            pageSize={pageSize}
            query={query}
            sort={sort}
            status={status}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
