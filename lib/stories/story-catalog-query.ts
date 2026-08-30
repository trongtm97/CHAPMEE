import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";
import { MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/lib/shared/pagination";

export const CATALOG_STORY_SELECT = `id, title, slug, public_code, hook, short_description, cover_url, published_at, updated_at, is_completed, structure_type, standalone_reading_time_minutes, content_origin, rights_status, original_language, translated_language, ${CREATOR_PROFILE_STORY_JOIN}`;

export const CATALOG_STORY_ID_SELECT =
  "id, hook, title, short_description, is_completed";

export const CATALOG_PAGE_SIZE_OPTIONS = [24, 48] as const;
export const DEFAULT_CATALOG_PAGE_SIZE = 24;
export const DESKTOP_CATALOG_PAGE_SIZE = 24;
export const CATALOG_PAGE_SIZES = CATALOG_PAGE_SIZE_OPTIONS;
export { MAX_PAGE_SIZE, MIN_PAGE_SIZE };
export const RANKING_CATALOG_LIMIT = 2000;

export type NormalizedCatalogParams = {
  q: string;
  genre: string;
  contentOrigin?: "original" | "translation";
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
  page: number;
  pageSize: number;
};

export function escapeIlikePattern(value: string) {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export function clampPage(page: number) {
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function clampPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) {
    return DEFAULT_CATALOG_PAGE_SIZE;
  }
  const value = Math.floor(pageSize);
  if (CATALOG_PAGE_SIZE_OPTIONS.includes(value as (typeof CATALOG_PAGE_SIZE_OPTIONS)[number])) {
    return value;
  }
  return Math.min(Math.max(value, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
}

export function getCatalogOffset(page: number, pageSize: number) {
  return (clampPage(page) - 1) * pageSize;
}

export function getTotalPages(totalCount: number, pageSize: number) {
  if (totalCount <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function isScoreSortedCatalog(sort: StoryCatalogSort) {
  return sort === "hot" || sort === "reads";
}

export function isMetricSortedCatalog(sort: StoryCatalogSort) {
  return (
    sort === "saved" ||
    sort === "chapters" ||
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "chapter_price_asc" ||
    sort === "chapter_price_desc"
  );
}

export function formatCatalogCount(total: number) {
  return new Intl.NumberFormat("vi-VN").format(total);
}

export type { PaginationItem } from "@/lib/shared/pagination-items";
export { getPaginationItems } from "@/lib/shared/pagination-items";
