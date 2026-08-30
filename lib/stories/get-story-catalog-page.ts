import {
  buildPaginatedResult,
  clampPage,
  type PaginatedResult
} from "@/lib/shared/pagination";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import {
  getPublicStoriesCatalog,
  type StoryCatalogResult
} from "@/lib/stories/get-public-stories";
import { enrichStoryCatalogStories } from "@/lib/stories/enrich-story-catalog-stories";
import { clampPageSize, DEFAULT_CATALOG_PAGE_SIZE } from "@/lib/stories/story-catalog-query";
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

/** DB catalog only — safe to call inside unstable_cache. */
export async function getStoryCatalogPageCore(
  filters: StoryCatalogPageFilters = {}
): Promise<StoryCatalogPageResult> {
  const page = clampPage(filters.page);
  const pageSize = filters.pageSize ? clampPageSize(filters.pageSize) : DEFAULT_CATALOG_PAGE_SIZE;

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

/**
 * Unified server-side catalog page service.
 * Filters and pagination happen in the database layer via getPublicStoriesCatalog.
 */
export async function getStoryCatalogPage(
  filters: StoryCatalogPageFilters = {}
): Promise<StoryCatalogPageResult> {
  const core = await getStoryCatalogPageCore(filters);
  const items = await enrichStoryCatalogStories(core.items);
  return { ...core, items };
}

/** Alias for backward compatibility. */
export const getStoryCatalog = getStoryCatalogPage;
