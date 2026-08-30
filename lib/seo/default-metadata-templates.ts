import type { SeoMetadataTemplate } from "@/types/admin-seo";

/** Client-safe defaults — no server imports. */
export const DEFAULT_SEO_METADATA_TEMPLATES: Omit<
  SeoMetadataTemplate,
  "id" | "updated_at"
>[] = [
  {
    page_type: "story",
    title_template: "{{story_title}} - Đọc truyện trên {{site_name}}",
    description_template:
      "Đọc {{story_title}} của {{author_name}}. Cập nhật chương mới, lưu truyện và theo dõi tác giả trên {{site_name}}.",
    og_title_template: "{{story_title}} | {{site_name}}",
    og_description_template: "{{short_description}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "chapter",
    title_template: "{{story_title}} - {{chapter_title}}",
    description_template:
      "Đọc {{chapter_title}} của truyện {{story_title}} trên {{site_name}}.",
    og_title_template: "{{chapter_title}} - {{story_title}}",
    og_description_template: "Chương {{chapter_number}} · {{story_title}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "author",
    title_template: "{{author_name}} - Tác giả trên {{site_name}}",
    description_template:
      "Xem hồ sơ tác giả {{author_name}}, các truyện đã đăng và nội dung mới nhất trên {{site_name}}.",
    og_title_template: "{{author_name}} | {{site_name}}",
    og_description_template: "Hồ sơ tác giả {{author_name}} trên {{site_name}}.",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "content_post",
    title_template: "{{post_title}} - {{site_name}}",
    description_template: "{{post_excerpt}}",
    og_title_template: "{{post_title}}",
    og_description_template: "{{post_excerpt}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "reels",
    title_template: "{{site_name}}",
    description_template: "Xem Reels truyện ngắn, đề xuất và đang lên trên {{site_name}}.",
    og_title_template: "{{site_name}}",
    og_description_template: "Reels truyện trên {{site_name}}",
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  },
  {
    page_type: "discover",
    title_template: "Khám phá truyện | {{site_name}}",
    description_template: "Tìm truyện, tác giả và thể loại yêu thích trên {{site_name}}.",
    og_title_template: null,
    og_description_template: null,
    twitter_title_template: null,
    twitter_description_template: null,
    robots_directive: "index,follow",
    canonical_mode: "self",
    is_active: true
  }
];

export const SEO_TEMPLATE_VARIABLES = [
  "site_name",
  "story_title",
  "chapter_title",
  "chapter_number",
  "author_name",
  "category_name",
  "genre_name",
  "reels_title",
  "post_title",
  "post_excerpt",
  "announcement_title",
  "short_description",
  "current_year"
] as const;
