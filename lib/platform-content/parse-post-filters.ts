export type ContentPostSort =
  | "updated"
  | "created"
  | "published"
  | "views"
  | "seo_score"
  | "title";

export type ContentPostIndexFilter = "all" | "index" | "noindex";

export type ContentPostSeoFilter =
  | "all"
  | "good"
  | "missing_title"
  | "missing_description"
  | "invalid_slug"
  | "heading_error"
  | "canonical_error"
  | "has_issue";

export type ContentPostDateRange = "all" | "7d" | "30d" | "90d";

export type ContentPostListFilters = {
  search: string;
  status: "all" | import("@/types/platform-content").ContentPostStatus;
  postType: "all" | import("@/types/platform-content").ContentPostType;
  indexFilter: ContentPostIndexFilter;
  seoFilter: ContentPostSeoFilter;
  dateRange: ContentPostDateRange;
  sort: ContentPostSort;
  page: number;
  pageSize: number;
};

export const CONTENT_POST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const CONTENT_POST_PAGE_SIZE_DEFAULT = 25;

export const CONTENT_POST_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã đăng" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "archived", label: "Archived" }
] as const;

export const CONTENT_POST_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại" },
  { value: "article", label: "Article" },
  { value: "guide", label: "Guide" },
  { value: "seo", label: "SEO" },
  { value: "editorial", label: "Editorial" },
  { value: "policy", label: "Policy" },
  { value: "news", label: "News" }
] as const;

export const CONTENT_POST_INDEX_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả index" },
  { value: "index", label: "Index" },
  { value: "noindex", label: "Noindex" }
] as const;

export const CONTENT_POST_SEO_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả SEO" },
  { value: "good", label: "Tốt" },
  { value: "missing_title", label: "Thiếu title" },
  { value: "missing_description", label: "Thiếu description" },
  { value: "invalid_slug", label: "Slug lỗi" },
  { value: "heading_error", label: "Heading lỗi" },
  { value: "canonical_error", label: "Canonical lỗi" },
  { value: "has_issue", label: "Có vấn đề SEO" }
] as const;

export const CONTENT_POST_DATE_RANGE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "90d", label: "90 ngày" }
] as const;

export const CONTENT_POST_SORT_OPTIONS = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "created", label: "Mới tạo" },
  { value: "published", label: "Ngày đăng" },
  { value: "views", label: "Lượt xem" },
  { value: "seo_score", label: "SEO score" },
  { value: "title", label: "A-Z" }
] as const;

const VALID_STATUSES = CONTENT_POST_STATUS_FILTER_OPTIONS.map((o) => o.value);
const VALID_TYPES = CONTENT_POST_TYPE_FILTER_OPTIONS.map((o) => o.value);
const VALID_INDEX = CONTENT_POST_INDEX_FILTER_OPTIONS.map((o) => o.value);
const VALID_SEO = CONTENT_POST_SEO_FILTER_OPTIONS.map((o) => o.value);
const VALID_DATE = CONTENT_POST_DATE_RANGE_OPTIONS.map((o) => o.value);
const VALID_SORTS = CONTENT_POST_SORT_OPTIONS.map((o) => o.value);

function readQueryValue(query: Record<string, string | string[] | undefined>, key: string) {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseContentPostListFilters(
  query: Record<string, string | string[] | undefined>
): ContentPostListFilters {
  const pageRaw = Number(readQueryValue(query, "page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSizeRaw = Number(readQueryValue(query, "size") ?? String(CONTENT_POST_PAGE_SIZE_DEFAULT));
  const pageSize = CONTENT_POST_PAGE_SIZE_OPTIONS.includes(
    pageSizeRaw as (typeof CONTENT_POST_PAGE_SIZE_OPTIONS)[number]
  )
    ? pageSizeRaw
    : CONTENT_POST_PAGE_SIZE_DEFAULT;

  const statusRaw = readQueryValue(query, "status") ?? "all";
  const typeRaw = readQueryValue(query, "type") ?? "all";
  const indexRaw = readQueryValue(query, "index") ?? "all";
  const seoRaw = readQueryValue(query, "seo") ?? "all";
  const dateRaw = readQueryValue(query, "range") ?? "all";
  const sortRaw = readQueryValue(query, "sort") ?? "updated";

  return {
    search: (readQueryValue(query, "q") ?? "").trim(),
    status: (VALID_STATUSES.includes(statusRaw as typeof VALID_STATUSES[number])
      ? statusRaw
      : "all") as ContentPostListFilters["status"],
    postType: (VALID_TYPES.includes(typeRaw as typeof VALID_TYPES[number])
      ? typeRaw
      : "all") as ContentPostListFilters["postType"],
    indexFilter: (VALID_INDEX.includes(indexRaw as typeof VALID_INDEX[number])
      ? indexRaw
      : "all") as ContentPostIndexFilter,
    seoFilter: (VALID_SEO.includes(seoRaw as typeof VALID_SEO[number])
      ? seoRaw
      : "all") as ContentPostSeoFilter,
    dateRange: (VALID_DATE.includes(dateRaw as typeof VALID_DATE[number])
      ? dateRaw
      : "all") as ContentPostDateRange,
    sort: (VALID_SORTS.includes(sortRaw as typeof VALID_SORTS[number])
      ? sortRaw
      : "updated") as ContentPostSort,
    page,
    pageSize
  };
}

export function buildContentPostListQuery(filters: ContentPostListFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.postType !== "all") params.set("type", filters.postType);
  if (filters.indexFilter !== "all") params.set("index", filters.indexFilter);
  if (filters.seoFilter !== "all") params.set("seo", filters.seoFilter);
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== CONTENT_POST_PAGE_SIZE_DEFAULT) {
    params.set("size", String(filters.pageSize));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getDefaultContentPostListFilters(): ContentPostListFilters {
  return {
    search: "",
    status: "all",
    postType: "all",
    indexFilter: "all",
    seoFilter: "all",
    dateRange: "all",
    sort: "updated",
    page: 1,
    pageSize: CONTENT_POST_PAGE_SIZE_DEFAULT
  };
}

export function countActiveContentPostFilters(filters: ContentPostListFilters) {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.postType !== "all") count += 1;
  if (filters.indexFilter !== "all") count += 1;
  if (filters.seoFilter !== "all") count += 1;
  if (filters.dateRange !== "all") count += 1;
  if (filters.sort !== "updated") count += 1;
  return count;
}
