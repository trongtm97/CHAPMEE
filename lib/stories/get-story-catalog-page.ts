import {
  buildPaginatedResult,
  clampPage,
  normalizePageSize,
  type PaginatedResult
} from "@/lib/shared/pagination";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import {
  getPublicStoriesCatalog,
  type StoryCatalogResult
} from "@/lib/stories/get-public-stories";
import type { StoryCatalogGenre, StoryCatalogStory } from "@/types/story";

export type StoryCatalogPageFilters = StoryCatalogFilterParams;

export type StoryCatalogPageResult = PaginatedResult<StoryCatalogStory> & {
  genres: StoryCatalogGenre[];
  filters: StoryCatalogFilterParams;
  query: string;
  genre: string;
  sort: StoryCatalogResult["sort"];
  status: StoryCatalogResult["status"];
};

/**
 * Unified server-side catalog page service.
 * Filters and pagination happen in the database layer via getPublicStoriesCatalog.
 */
export async function getStoryCatalogPage(
  filters: StoryCatalogPageFilters = {}
): Promise<StoryCatalogPageResult> {
  const page = clampPage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  const result = await getPublicStoriesCatalog({
    ...filters,
    page,
    pageSize
  });

  const paginated = buildPaginatedResult(
    result.stories,
    result.totalCount,
    result.page,
    result.pageSize
  );

  return {
    ...paginated,
    genres: result.genres,
    filters: result.filters,
    query: result.query,
    genre: result.genre,
    sort: result.sort,
    status: result.status
  };
}

/** Alias for backward compatibility. */
export const getStoryCatalog = getStoryCatalogPage;
