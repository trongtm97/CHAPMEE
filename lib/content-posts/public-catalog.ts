import type { ContentPostType } from "@/types/platform-content";

export const PUBLIC_CONTENT_HUB_PAGE_SIZE = 18;

export type PublicPostSort = "published" | "views" | "updated";

export type PublicPostCategoryFilter =
  | "all"
  | "guide"
  | "news"
  | "editorial"
  | "reader"
  | "update";

export const PUBLIC_POST_CATEGORY_OPTIONS: Array<{
  value: PublicPostCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "guide", label: "Hướng dẫn" },
  { value: "news", label: "Tin nền tảng" },
  { value: "editorial", label: "Góc tác giả" },
  { value: "reader", label: "Góc người đọc" },
  { value: "update", label: "Cập nhật" }
];

export const PUBLIC_POST_SORT_OPTIONS: Array<{
  value: PublicPostSort;
  label: string;
}> = [
  { value: "published", label: "Mới nhất" },
  { value: "views", label: "Được quan tâm" },
  { value: "updated", label: "Cập nhật gần đây" }
];

export function resolvePublicPostFilters(category: PublicPostCategoryFilter): {
  postType?: ContentPostType;
  category?: string;
} {
  switch (category) {
    case "guide":
      return { postType: "guide" };
    case "news":
      return { postType: "news" };
    case "editorial":
      return { postType: "editorial" };
    case "reader":
      return { category: "goc-nguoi-doc" };
    case "update":
      return { category: "cap-nhat" };
    default:
      return {};
  }
}

export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const PUBLIC_POST_TYPE_LABELS: Record<ContentPostType, string> = {
  article: "Bài viết",
  guide: "Hướng dẫn",
  seo: "SEO",
  editorial: "Góc tác giả",
  policy: "Chính sách",
  news: "Tin nền tảng"
};

export function getPublicPostTypeLabel(type: ContentPostType | string): string {
  return PUBLIC_POST_TYPE_LABELS[type as ContentPostType] ?? "Bài viết";
}

export const CONTENT_HUB_TOPIC_LINKS: Array<{
  href: string;
  label: string;
  description: string;
}> = [
  {
    href: "/bai-viet?category=guide",
    label: "Hướng dẫn đọc truyện",
    description: "Bắt đầu với ChapMee"
  },
  {
    href: "/bai-viet?category=editorial",
    label: "Góc tác giả",
    description: "Studio & xuất bản"
  },
  {
    href: "/bai-viet?category=reader",
    label: "Góc người đọc",
    description: "Thư viện & mẹo đọc"
  },
  {
    href: "/bai-viet?category=update",
    label: "Cập nhật nền tảng",
    description: "Tin mới từ ChapMee"
  }
];

export const CONTENT_HUB_HERO_CTAS: Array<{ href: string; label: string }> = [
  { href: "/bai-viet?category=guide", label: "Hướng dẫn đọc truyện" },
  { href: "/bai-viet?category=editorial", label: "Dành cho tác giả" },
  { href: "/bai-viet?category=update", label: "Cập nhật ChapMee" }
];

export function buildPublicPostListQuery(input: {
  page?: number;
  q?: string;
  category?: PublicPostCategoryFilter;
  sort?: PublicPostSort;
}): string {
  const params = new URLSearchParams();
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.category && input.category !== "all") params.set("category", input.category);
  if (input.sort && input.sort !== "published") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function parsePublicPostListParams(query: Record<string, string | string[] | undefined>) {
  const pageRaw = Number(Array.isArray(query.page) ? query.page[0] : query.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const q = String(Array.isArray(query.q) ? query.q[0] : query.q ?? "").trim();
  const categoryRaw = String(
    Array.isArray(query.category) ? query.category[0] : query.category ?? "all"
  );
  const sortRaw = String(Array.isArray(query.sort) ? query.sort[0] : query.sort ?? "published");

  const category = PUBLIC_POST_CATEGORY_OPTIONS.some((o) => o.value === categoryRaw)
    ? (categoryRaw as PublicPostCategoryFilter)
    : "all";
  const sort = PUBLIC_POST_SORT_OPTIONS.some((o) => o.value === sortRaw)
    ? (sortRaw as PublicPostSort)
    : "published";

  return { page, q, category, sort };
}
