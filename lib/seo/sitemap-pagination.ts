import {
  isSitemapSegmentId,
  type SitemapSegmentId
} from "@/lib/seo/sitemap-segments";

/** RankMath default — keeps each child sitemap small and fast to parse. */
export const DEFAULT_SITEMAP_URLS_PER_PAGE = 200;

/** Google protocol max is 50_000; we stay well below for performance. */
export const MAX_SITEMAP_URLS_PER_PAGE = 1000;

export type SitemapChildRef = {
  id: string;
  segment: SitemapSegmentId;
  page: number;
  path: string;
};

export type SitemapPagination = {
  page: number;
  perPage: number;
};

export function normalizeUrlsPerPage(value?: number | null): number {
  if (value == null || !Number.isFinite(value)) {
    return DEFAULT_SITEMAP_URLS_PER_PAGE;
  }
  const rounded = Math.floor(value);
  if (rounded < 1) {
    return DEFAULT_SITEMAP_URLS_PER_PAGE;
  }
  return Math.min(rounded, MAX_SITEMAP_URLS_PER_PAGE);
}

export function pageCountForUrls(total: number, perPage: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.ceil(total / perPage);
}

export function encodeSitemapChildId(segment: SitemapSegmentId, page: number): string {
  const safePage = Math.max(1, Math.floor(page));
  return safePage === 1 ? segment : `${segment}-${safePage}`;
}

export function parseSitemapChildId(value: string): SitemapChildRef | null {
  const match = /^([a-z]+)(?:-(\d+))?$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const segment = match[1];
  const page = match[2] ? Number(match[2]) : 1;

  if (!isSitemapSegmentId(segment) || !Number.isFinite(page) || page < 1) {
    return null;
  }

  return {
    id: encodeSitemapChildId(segment, page),
    page,
    path: `/sitemap/${encodeSitemapChildId(segment, page)}.xml`,
    segment
  };
}

export function paginationOffset(pagination: SitemapPagination): {
  from: number;
  to: number;
} {
  const from = (pagination.page - 1) * pagination.perPage;
  return { from, to: from + pagination.perPage - 1 };
}

/** Segments that can grow large enough to require pagination. */
export const PAGINATED_SITEMAP_SEGMENTS = new Set<SitemapSegmentId>([
  "stories",
  "chapters",
  "taxonomy",
  "authors",
  "posts",
  "reels"
]);

export function segmentUsesPagination(segment: SitemapSegmentId): boolean {
  return PAGINATED_SITEMAP_SEGMENTS.has(segment);
}
