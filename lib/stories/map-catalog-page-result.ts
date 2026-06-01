import type { StoryCatalogPageResult } from "@/lib/stories/get-story-catalog-page";
import type { StoryCatalogResult } from "@/lib/stories/get-public-stories";

/** Map unified page service output to legacy catalog props used by UI. */
export function mapStoryCatalogPageToResult(
  page: StoryCatalogPageResult
): StoryCatalogResult {
  return {
    stories: page.items,
    genres: page.genres,
    totalCount: page.total_count,
    page: page.page,
    pageSize: page.page_size,
    totalPages: page.total_pages,
    query: page.query,
    genre: page.genre,
    sort: page.sort,
    status: page.status,
    filters: page.filters
  };
}

export type StoryCatalogPageUiProps = StoryCatalogResult & {
  hasNext?: boolean;
  hasPrev?: boolean;
};

export function mapStoryCatalogPageToUiProps(
  page: StoryCatalogPageResult
): StoryCatalogPageUiProps {
  return {
    ...mapStoryCatalogPageToResult(page),
    hasNext: page.has_next,
    hasPrev: page.has_prev
  };
}
