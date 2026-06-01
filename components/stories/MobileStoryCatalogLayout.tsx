import Link from "next/link";
import { StoryCatalogFilters } from "@/components/stories/StoryCatalogFilters";
import { StoryCatalogList } from "@/components/stories/StoryCatalogList";
import { StoryCatalogSummary } from "@/components/stories/StoryCatalogSummary";
import { StoryPagination } from "@/components/stories/StoryPagination";
import type { StoryCatalogLayoutProps } from "@/components/stories/DesktopStoryCatalogLayout";

export function MobileStoryCatalogLayout({
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
    <div className="pb-2 lg:hidden">
      {hideCatalogHeader ? null : (
        <header className="space-y-1">
          <p className="text-[11px] text-zinc-500">
            <Link className="text-zinc-400 hover:text-zinc-200" href="/discover">
              Khám phá
            </Link>
            <span className="text-zinc-600"> / </span>
            <span>Danh mục truyện</span>
          </p>
          <h1 className="text-xl font-black text-zinc-50">Danh mục truyện</h1>
        </header>
      )}

      <div className={hideCatalogHeader ? "space-y-3" : "mt-3 space-y-3"}>
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

        <StoryCatalogSummary page={page} totalCount={totalCount} totalPages={totalPages} />

        <StoryCatalogList
          stories={stories}
          trackingContext={trackingContext}
          trackingSurface={trackingSurface}
        />

        <StoryPagination
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
    </div>
  );
}
