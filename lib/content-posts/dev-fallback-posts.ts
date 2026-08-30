import {
  estimateReadingMinutes,
  resolvePublicPostFilters,
  type PublicPostCategoryFilter,
  type PublicPostSort
} from "@/lib/content-posts/public-catalog";
import type { AdminContentPost, ContentPostType } from "@/types/platform-content";

/**
 * TODO: Remove when admin content hub has published posts in all environments.
 * Dev-only fallback so /bai-viet is not empty during local setup.
 */
const NOW = "2026-01-15T08:00:00.000Z";

const DEV_PUBLIC_CODES: Record<string, string> = {
  "chapmee-la-gi-cach-doc-truyen": "91000001",
  "cach-dung-reels-kham-pha-truyen": "91000002",
  "tao-tai-khoan-luu-truyen-yeu-thich": "91000003",
  "tac-gia-bat-dau-voi-chapmee-studio": "91000004",
  "xay-dung-ho-so-tac-gia-thu-hut": "91000005",
  "cap-nhat-chapmee-tinh-nang-dang-phat-trien": "91000006"
};

function post(input: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  post_type: ContentPostType;
  category?: string | null;
  featured?: boolean;
  view_count?: number;
}): AdminContentPost {
  const published_at = NOW;
  return {
    id: `dev-${input.slug}`,
    title: input.title,
    slug: input.slug,
    public_code: DEV_PUBLIC_CODES[input.slug] ?? "91000099",
    excerpt: input.excerpt,
    content: input.content,
    cover_image_url: null,
    cover_media_asset_id: null,
    category: input.category ?? null,
    tags: input.featured ? ["featured"] : [],
    post_type: input.post_type,
    status: "published",
    seo_title: input.title,
    seo_description: input.excerpt,
    canonical_url: `/bai-viet/${input.slug}`,
    indexable: true,
    robots: "index,follow",
    og_title: null,
    og_description: null,
    og_image_url: null,
    author_admin_id: null,
    updated_by: null,
    published_at,
    scheduled_at: null,
    archived_at: null,
    deleted_at: null,
    view_count: input.view_count ?? 0,
    created_at: published_at,
    updated_at: published_at,
    coverDisplayUrl: null
  };
}

export const DEV_FALLBACK_CONTENT_POSTS: AdminContentPost[] = [
  post({
    slug: "chapmee-la-gi-cach-doc-truyen",
    title: "ChapMee là gì? Cách lướt và đọc truyện theo kiểu mới",
    excerpt:
      "Làm quen giao diện ChapMee, Reels khám phá và cách theo dõi truyện yêu thích trên một nền tảng giải trí text.",
    content: `## ChapMee dành cho ai?

ChapMee là nền tảng giải trí text/story: đọc truyện, lướt Reels khám phá nhanh và tham gia cộng đồng quanh từng tác phẩm.

## Bắt đầu đọc

1. Vào **Khám phá** hoặc **Reels** để tìm truyện.
2. Mở trang truyện, chọn chap và đọc liền mạch.
3. Lưu vào thư viện để đọc tiếp sau.

## Mẹo nhỏ

- Dùng tìm kiếm trên Khám phá khi bạn đã biết tên truyện.
- Theo dõi tác giả để nhận cập nhật chap mới.`,
    post_type: "guide",
    category: "huong-dan-doc",
    featured: true,
    view_count: 24
  }),
  post({
    slug: "cach-dung-reels-kham-pha-truyen",
    title: "Cách dùng Reels để khám phá truyện nhanh hơn",
    excerpt:
      "Reels giúp bạn lướt qua hook, thể loại và vibe truyện trước khi mở đọc dài.",
    content: `## Reels trên ChapMee

Reels là lớp khám phá ngắn: xem đoạn mở đầu, cảm nhận phong cách rồi chuyển sang đọc chap.

## Cách dùng hiệu quả

- Vuốt để xem truyện tiếp theo trong feed.
- Chạm vào tiêu đề khi muốn vào trang truyện đầy đủ.
- Lưu truyện hay nếu muốn quay lại sau.`,
    post_type: "guide",
    featured: true,
    view_count: 18
  }),
  post({
    slug: "tao-tai-khoan-luu-truyen-yeu-thich",
    title: "Hướng dẫn tạo tài khoản và lưu truyện yêu thích",
    excerpt: "Đăng ký, đăng nhập và quản lý thư viện đọc cá nhân trên ChapMee.",
    content: `## Tạo tài khoản

Truy cập **Đăng ký**, xác nhận email và hoàn tất hồ sơ cơ bản.

## Lưu truyện

- Trên trang truyện, chọn **Lưu** hoặc thêm vào bộ sưu tập.
- Xem lại trong **Thư viện** hoặc mục đọc tiếp trên trang cá nhân.`,
    post_type: "guide",
    category: "goc-nguoi-doc",
    featured: true,
    view_count: 15
  }),
  post({
    slug: "tac-gia-bat-dau-voi-chapmee-studio",
    title: "Dành cho tác giả: bắt đầu viết truyện trên ChapMee Studio",
    excerpt: "Từ thiết lập Studio đến đăng chap đầu tiên — quy trình gọn cho tác giả mới.",
    content: `## Vào Studio

Sau khi bật chế độ tác giả, mở **Studio** để tạo truyện mới.

## Quy trình gợi ý

1. Tạo truyện, viết hook và mô tả ngắn.
2. Thêm chap, xem trước trên mobile.
3. Xuất bản khi sẵn sàng — có thể lên lịch sau.`,
    post_type: "editorial",
    category: "goc-tac-gia",
    view_count: 11
  }),
  post({
    slug: "xay-dung-ho-so-tac-gia-thu-hut",
    title: "Cách xây dựng hồ sơ tác giả thu hút người đọc",
    excerpt: "Ảnh bìa, pen name và lời giới thiệu giúp người đọc tin tưởng trước khi theo dõi.",
    content: `## Hồ sơ rõ ràng

- Pen name dễ nhớ, nhất quán trên truyện và cộng đồng.
- Mô tả ngắn nêu thể loại bạn viết nhiều nhất.

## Tương tác

Trả lời bình luận, cập nhật lịch đăng — giúp độc giả biết khi nào có chap mới.`,
    post_type: "editorial",
    category: "goc-tac-gia",
    view_count: 9
  }),
  post({
    slug: "cap-nhat-chapmee-tinh-nang-dang-phat-trien",
    title: "Cập nhật ChapMee: các tính năng đang phát triển",
    excerpt: "Tổng quan hướng phát triển nền tảng — không phải cam kết pháp lý hay chứng nhận.",
    content: `## Tin cập nhật

ChapMee liên tục cải thiện trải nghiệm đọc, Studio và công cụ tác giả.

## Bạn có thể làm gì

- Theo dõi mục **Bài viết** để đọc hướng dẫn mới.
- Gửi phản hồi qua trang **Liên hệ** nếu có góp ý sản phẩm.`,
    post_type: "news",
    category: "cap-nhat",
    view_count: 7
  })
];

export function isDevFallbackEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function getDevFallbackPostBySlug(slug: string): AdminContentPost | null {
  if (!isDevFallbackEnabled()) return null;
  return DEV_FALLBACK_CONTENT_POSTS.find((p) => p.slug === slug) ?? null;
}

export function getDevFallbackPostByPublicCode(code: string): AdminContentPost | null {
  if (!isDevFallbackEnabled()) return null;
  return DEV_FALLBACK_CONTENT_POSTS.find((p) => p.public_code === code) ?? null;
}

function matchesSearch(item: AdminContentPost, q: string): boolean {
  const term = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(term) ||
    (item.excerpt ?? "").toLowerCase().includes(term) ||
    (item.content ?? "").toLowerCase().includes(term) ||
    item.slug.toLowerCase().includes(term)
  );
}

function sortDevPosts(items: AdminContentPost[], sort: PublicPostSort): AdminContentPost[] {
  const copy = [...items];
  if (sort === "views") {
    return copy.sort((a, b) => b.view_count - a.view_count || b.slug.localeCompare(a.slug));
  }
  if (sort === "updated") {
    return copy.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }
  return copy.sort(
    (a, b) =>
      new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
  );
}

export function listDevFallbackPosts(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: PublicPostSort;
  category?: PublicPostCategoryFilter;
  excludeIds?: string[];
}): { items: AdminContentPost[]; total: number } {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 12;
  const filters = resolvePublicPostFilters(options.category ?? "all");

  let items = DEV_FALLBACK_CONTENT_POSTS.filter((item) => {
    if (options.excludeIds?.includes(item.id)) return false;
    if (filters.postType && item.post_type !== filters.postType) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (options.search?.trim() && !matchesSearch(item, options.search.trim())) return false;
    return true;
  });

  items = sortDevPosts(items, options.sort ?? "published");
  const total = items.length;
  const offset = (page - 1) * pageSize;
  return { items: items.slice(offset, offset + pageSize), total };
}

export function getDevFeaturedPosts(limit = 4): AdminContentPost[] {
  const featured = DEV_FALLBACK_CONTENT_POSTS.filter(
    (p) => p.tags.includes("featured") || p.view_count >= 15
  );
  return sortDevPosts(featured, "views").slice(0, limit);
}

export function shouldUseDevFallback(total: number, error: string | null): boolean {
  return isDevFallbackEnabled() && !error && total === 0;
}

export function enrichDevPostReadingMeta(item: AdminContentPost): AdminContentPost {
  return {
    ...item,
    coverDisplayUrl: item.coverDisplayUrl ?? null
  };
}

export function getDevPostReadingMinutes(item: AdminContentPost): number {
  return estimateReadingMinutes(item.content ?? item.excerpt ?? "");
}
