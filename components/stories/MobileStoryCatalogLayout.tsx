import Link from "next/link";
import { StoryCatalogFilterCockpit } from "@/components/story-catalog/StoryCatalogFilterCockpit";
import { StoryCatalogHeader } from "@/components/story-catalog/StoryCatalogHeader";
import { StoryCatalogList } from "@/components/story-catalog/StoryCatalogList";
import { StoryCatalogPagination } from "@/components/story-catalog/StoryCatalogPagination";
import { StoryCatalogResultsToolbar } from "@/components/story-catalog/StoryCatalogResultsToolbar";
import type { StoryCatalogLayoutProps } from "@/components/stories/DesktopStoryCatalogLayout";

export function MobileStoryCatalogLayout({
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
    <div className="space-y-3 pb-24 lg:hidden">
      {hideCatalogHeader ? null : (
        <div className="space-y-2">
          <p className="text-[11px] text-zinc-500">
            <Link className="text-zinc-400 hover:text-zinc-200" href="/discover">
              Khám phá
            </Link>
            <span className="text-zinc-600"> / </span>
            <span>{title}</span>
          </p>
          <StoryCatalogHeader subtitle={subtitle} title={title} />
        </div>
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

      <StoryCatalogResultsToolbar
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      <StoryCatalogList
        audioBadgeDisplay={audioBadgeDisplay}
        query={query}
        stories={stories}
        trackingContext={trackingContext}
        trackingSurface={trackingSurface}
      />

      <StoryCatalogPagination
        filters={filters}
        genre={genre}
        layout="mobile"
        page={page}
        pageSize={pageSize}
        query={query}
        sort={sort}
        status={status}
        totalPages={totalPages}
      />
    </div>
  );
}
