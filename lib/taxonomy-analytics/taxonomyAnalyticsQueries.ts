import type { TaxonomyAnalyticsFilters } from "@/types/taxonomy-analytics";

export type TaxonomyPagination = {
  page: number;
  pageSize: number;
};

export function parsePagination(searchParams: URLSearchParams): TaxonomyPagination {
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  return { page, pageSize };
}

export function sliceWithPagination<T>(rows: T[], pagination: TaxonomyPagination) {
  const { page, pageSize } = pagination;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: rows.slice(start, end),
    page,
    pageSize,
    total,
    totalPages
  };
}

export function serializeFilters(filters: TaxonomyAnalyticsFilters) {
  return {
    from: filters.from,
    to: filters.to,
    type: filters.type,
    term: filters.termId,
    surface: filters.surface,
    mainGenre: filters.mainGenreId,
    creator: filters.creatorId,
    monetization: filters.monetizationType,
    completionMinStarts: filters.completionMinStarts,
    completionMinImpressions: filters.completionMinImpressions,
    completionMinStories: filters.completionMinStories
  };
}
