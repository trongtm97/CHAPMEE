export const CATALOG_PAGE_SIZES = [20, 40, 60] as const;
export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 10;

export type PaginatedResult<T> = {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

export function clampPage(page: number | undefined): number {
  if (!Number.isFinite(page) || (page ?? 0) < 1) {
    return 1;
  }
  return Math.floor(page!);
}

export function normalizePageSize(
  pageSize: number | undefined,
  allowed: readonly number[] = CATALOG_PAGE_SIZES
): number {
  if (!Number.isFinite(pageSize)) {
    return DEFAULT_PAGE_SIZE;
  }
  const value = Math.floor(pageSize!);
  if (allowed.includes(value as (typeof allowed)[number])) {
    return value;
  }
  if (value >= MIN_PAGE_SIZE && value <= MAX_PAGE_SIZE) {
    return value;
  }
  const nearest = [...allowed].sort(
    (a, b) => Math.abs(a - value) - Math.abs(b - value)
  )[0];
  return nearest ?? DEFAULT_PAGE_SIZE;
}

export function getOffset(page: number, pageSize: number): number {
  return (clampPage(page) - 1) * pageSize;
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (totalCount <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function buildPaginatedResult<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const safePage = clampPage(page);
  const totalPages = getTotalPages(totalCount, pageSize);
  const safeCurrentPage = Math.min(safePage, totalPages);

  return {
    items,
    total_count: totalCount,
    page: safeCurrentPage,
    page_size: pageSize,
    total_pages: totalPages,
    has_next: safeCurrentPage < totalPages,
    has_prev: safeCurrentPage > 1
  };
}
