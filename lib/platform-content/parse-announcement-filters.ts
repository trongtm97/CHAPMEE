export type AnnouncementSort =
  | "updated"
  | "published"
  | "oldest"
  | "title_asc"
  | "status"
  | "priority";

export type AnnouncementSeoFilter =
  | "all"
  | "index"
  | "noindex"
  | "missing_seo_title"
  | "missing_seo_description"
  | "seo_issue";

export type AnnouncementListFilters = {
  search: string;
  status: "all" | import("@/types/platform-content").AnnouncementStatus;
  announcementType: "all" | import("@/types/platform-content").AnnouncementType;
  audience: "all" | import("@/types/platform-content").AnnouncementAudienceType;
  visibility: "all" | import("@/types/platform-content").AnnouncementVisibility;
  seo: AnnouncementSeoFilter;
  sort: AnnouncementSort;
  page: number;
  pageSize: number;
};

export const ANNOUNCEMENT_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const ANNOUNCEMENT_PAGE_SIZE_DEFAULT = 25;

export const ANNOUNCEMENT_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã đăng" },
  { value: "scheduled", label: "Đã lên lịch" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "archived", label: "Archived" }
] as const;

export const ANNOUNCEMENT_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả loại" },
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "policy", label: "Policy" },
  { value: "monetization", label: "Monetization" },
  { value: "creator", label: "Creator" },
  { value: "reader", label: "Reader" },
  { value: "feature", label: "Feature" },
  { value: "warning", label: "Warning" }
] as const;

export const ANNOUNCEMENT_AUDIENCE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả đối tượng" },
  { value: "creators", label: "Chỉ tác giả" },
  { value: "readers", label: "Chỉ độc giả" },
  { value: "monetized_creators", label: "Đã bật kiếm tiền" },
  { value: "published_creators", label: "Có truyện đang đăng" },
  { value: "custom", label: "Tùy chọn" }
] as const;

export const ANNOUNCEMENT_VISIBILITY_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả hiển thị" },
  { value: "public", label: "Public" },
  { value: "targeted", label: "In-app" },
  { value: "admin_only", label: "Nội bộ" }
] as const;

export const ANNOUNCEMENT_SEO_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả SEO" },
  { value: "index", label: "Index" },
  { value: "noindex", label: "Noindex" },
  { value: "missing_seo_title", label: "Thiếu SEO title" },
  { value: "missing_seo_description", label: "Thiếu meta description" },
  { value: "seo_issue", label: "Có lỗi SEO" }
] as const;

export const ANNOUNCEMENT_SORT_OPTIONS = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "published", label: "Mới đăng" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "title_asc", label: "Tiêu đề A-Z" },
  { value: "status", label: "Trạng thái" },
  { value: "priority", label: "Mức ưu tiên" }
] as const;

const VALID_STATUSES = ANNOUNCEMENT_STATUS_FILTER_OPTIONS.map((o) => o.value);
const VALID_TYPES = ANNOUNCEMENT_TYPE_FILTER_OPTIONS.map((o) => o.value);
const VALID_AUDIENCES = [
  "all",
  "creators",
  "readers",
  "monetized_creators",
  "published_creators",
  "custom"
] as const;
const VALID_VISIBILITIES = ANNOUNCEMENT_VISIBILITY_FILTER_OPTIONS.map((o) => o.value);
const VALID_SEO = ANNOUNCEMENT_SEO_FILTER_OPTIONS.map((o) => o.value);
const VALID_SORTS = ANNOUNCEMENT_SORT_OPTIONS.map((o) => o.value);

function readQueryValue(query: Record<string, string | string[] | undefined>, key: string) {
  const value = query[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parseAnnouncementListFilters(
  query: Record<string, string | string[] | undefined>
): AnnouncementListFilters {
  const pageRaw = Number(readQueryValue(query, "page") ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSizeRaw = Number(readQueryValue(query, "size") ?? String(ANNOUNCEMENT_PAGE_SIZE_DEFAULT));
  const pageSize = ANNOUNCEMENT_PAGE_SIZE_OPTIONS.includes(
    pageSizeRaw as (typeof ANNOUNCEMENT_PAGE_SIZE_OPTIONS)[number]
  )
    ? pageSizeRaw
    : ANNOUNCEMENT_PAGE_SIZE_DEFAULT;

  const statusRaw = readQueryValue(query, "status") ?? "all";
  const typeRaw = readQueryValue(query, "type") ?? "all";
  const audienceRaw = readQueryValue(query, "audience") ?? "all";
  const visibilityRaw = readQueryValue(query, "visibility") ?? "all";
  const seoRaw = readQueryValue(query, "seo") ?? "all";
  const sortRaw = readQueryValue(query, "sort") ?? "updated";

  return {
    search: (readQueryValue(query, "q") ?? "").trim(),
    status: (VALID_STATUSES.includes(statusRaw as typeof VALID_STATUSES[number])
      ? statusRaw
      : "all") as AnnouncementListFilters["status"],
    announcementType: (VALID_TYPES.includes(typeRaw as typeof VALID_TYPES[number])
      ? typeRaw
      : "all") as AnnouncementListFilters["announcementType"],
    audience: (VALID_AUDIENCES.includes(audienceRaw as (typeof VALID_AUDIENCES)[number])
      ? audienceRaw
      : "all") as AnnouncementListFilters["audience"],
    visibility: (VALID_VISIBILITIES.includes(visibilityRaw as typeof VALID_VISIBILITIES[number])
      ? visibilityRaw
      : "all") as AnnouncementListFilters["visibility"],
    seo: (VALID_SEO.includes(seoRaw as typeof VALID_SEO[number])
      ? seoRaw
      : "all") as AnnouncementSeoFilter,
    sort: (VALID_SORTS.includes(sortRaw as typeof VALID_SORTS[number])
      ? sortRaw
      : "updated") as AnnouncementSort,
    page,
    pageSize
  };
}

export function buildAnnouncementListQuery(filters: AnnouncementListFilters) {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.announcementType !== "all") params.set("type", filters.announcementType);
  if (filters.audience !== "all") params.set("audience", filters.audience);
  if (filters.visibility !== "all") params.set("visibility", filters.visibility);
  if (filters.seo !== "all") params.set("seo", filters.seo);
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== ANNOUNCEMENT_PAGE_SIZE_DEFAULT) {
    params.set("size", String(filters.pageSize));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getDefaultAnnouncementListFilters(): AnnouncementListFilters {
  return {
    search: "",
    status: "all",
    announcementType: "all",
    audience: "all",
    visibility: "all",
    seo: "all",
    sort: "updated",
    page: 1,
    pageSize: ANNOUNCEMENT_PAGE_SIZE_DEFAULT
  };
}

export function buildPublicAnnouncementListQuery(input: {
  page?: number;
  type?: string;
}) {
  const params = new URLSearchParams();
  if (input.type && input.type !== "all") params.set("type", input.type);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function countActiveAnnouncementFilters(filters: AnnouncementListFilters) {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status !== "all") count += 1;
  if (filters.announcementType !== "all") count += 1;
  if (filters.audience !== "all") count += 1;
  if (filters.visibility !== "all") count += 1;
  if (filters.seo !== "all") count += 1;
  if (filters.sort !== "updated") count += 1;
  return count;
}
