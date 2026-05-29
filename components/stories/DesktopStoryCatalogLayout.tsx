import { StoryCatalogFilters } from "@/components/stories/StoryCatalogFilters";
import { StoryCatalogGrid } from "@/components/stories/StoryCatalogGrid";
import { StoryCatalogSummary } from "@/components/stories/StoryCatalogSummary";
import { StoryPagination } from "@/components/stories/StoryPagination";
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
};

export function DesktopStoryCatalogLayout({
  genre,
  genres,
  page,
  pageSize,
  query,
  sort,
  status,
  stories,
  totalCount,
  totalPages
}: StoryCatalogLayoutProps) {
  return (
    <div className="hidden space-y-4 pb-2 lg:block">
      <header className="space-y-1">
        <p className="page-kicker">Khám phá</p>
        <h1 className="page-title !mt-2 !text-[2rem]">Danh mục truyện</h1>
      </header>

      <StoryCatalogFilters genre={genre} genres={genres} query={query} sort={sort} status={status} />

      <StoryCatalogSummary page={page} totalCount={totalCount} totalPages={totalPages} />

      <StoryCatalogGrid stories={stories} />

      <StoryPagination
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
  );
}
