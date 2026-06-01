import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";
import {
  CATALOG_PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE
} from "@/lib/shared/pagination";

export const CATALOG_STORY_SELECT = `id, title, slug, public_code, hook, short_description, cover_url, published_at, is_completed, structure_type, standalone_reading_time_minutes, ${CREATOR_PROFILE_STORY_JOIN}`;

export const CATALOG_STORY_ID_SELECT =
  "id, hook, title, short_description, is_completed";

export const DEFAULT_CATALOG_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const DESKTOP_CATALOG_PAGE_SIZE = 40;
export { CATALOG_PAGE_SIZES, MAX_PAGE_SIZE, MIN_PAGE_SIZE };
export const RANKING_CATALOG_LIMIT = 2000;

export type NormalizedCatalogParams = {
  q: string;
  genre: string;
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
  if (CATALOG_PAGE_SIZES.includes(value as (typeof CATALOG_PAGE_SIZES)[number])) {
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

export type PaginationItem = number | "ellipsis";

export function getPaginationItems(currentPage: number, totalPages: number, siblingCount = 1): PaginationItem[] {
  if (totalPages <= 1) {
    return [1];
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let offset = 1; offset <= siblingCount; offset += 1) {
    pages.add(currentPage - offset);
    pages.add(currentPage + offset);
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]!;
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}
