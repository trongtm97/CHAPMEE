import { StoryCatalogFilterCockpit } from "@/components/story-catalog/StoryCatalogFilterCockpit";
import { StoryCatalogGrid } from "@/components/story-catalog/StoryCatalogGrid";
import { StoryCatalogHeader } from "@/components/story-catalog/StoryCatalogHeader";
import { StoryCatalogPagination } from "@/components/story-catalog/StoryCatalogPagination";
import { StoryCatalogResultsToolbar } from "@/components/story-catalog/StoryCatalogResultsToolbar";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogTrackingContext } from "@/types/story-catalog-tracking";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
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
  title?: string;
  subtitle?: string;
  hideMonetizationFilters?: boolean;
  hideAccessFilters?: boolean;
  allowedSorts?: StoryCatalogSort[];
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
};

export function DesktopStoryCatalogLayout({
  allowedSorts,
  audioBadgeDisplay,
  filterOptions,
  filters,
  genre,
  genres,
  hideAccessFilters = false,
  hideCatalogHeader = false,
  hideMonetizationFilters = false,
  page,
  pageSize,
  query,
  sort,
  status,
  stories,
  subtitle,
  title = "Danh mục truyện",
  totalCount,
  totalPages,
  trackingContext
}: StoryCatalogLayoutProps) {
  const trackingSurface = query.trim() ? "search" : "category";

  return (
    <div className="hidden space-y-4 pb-4 lg:block">
      {hideCatalogHeader ? null : (
        <StoryCatalogHeader subtitle={subtitle} title={title} />
      )}

      <StoryCatalogFilterCockpit
        allowedSorts={allowedSorts}
        filterOptions={filterOptions}
        filters={filters}
        genre={genre}
        genres={genres}
        hideAccessFilters={hideAccessFilters}
        hideMonetizationFilters={hideMonetizationFilters}
        query={query}
        sort={sort}
        status={status}
      />

      <div className="space-y-4">
        <StoryCatalogResultsToolbar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
        />

        <StoryCatalogGrid
          audioBadgeDisplay={audioBadgeDisplay}
          query={query}
          stories={stories}
          trackingContext={trackingContext}
          trackingSurface={trackingSurface}
        />

        <StoryCatalogPagination
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
  );
}
