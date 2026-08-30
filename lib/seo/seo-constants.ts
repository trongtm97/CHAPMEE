/** SEO Center constants — shared by admin, services, and validation. */

export const SEO_TARGET_TYPES = [
  "route",
  "story",
  "chapter",
  "profile",
  "taxonomy",
  "media",
  "article",
  "ranking",
  "discover"
] as const;

export type SeoTargetType = (typeof SEO_TARGET_TYPES)[number];

export const SEO_REDIRECT_STATUS_CODES = [301, 302, 307, 308] as const;

export type SeoRedirectStatusCode = (typeof SEO_REDIRECT_STATUS_CODES)[number];

export const SEO_CONTENT_STATUSES = ["draft", "published", "archived"] as const;

export type SeoContentStatus = (typeof SEO_CONTENT_STATUSES)[number];

export const SEO_CONTENT_PLACEMENTS = ["before_footer"] as const;

export type SeoContentPlacement = (typeof SEO_CONTENT_PLACEMENTS)[number];

/** Page types for content blocks and template grouping. */
export const SEO_PAGE_TYPES = [
  "home",
  "discover",
  "story_catalog",
  "story_detail",
  "chapter",
  "profile",
  "taxonomy",
  "media",
  "article",
  "ranking",
  "community",
  "content_post",
  "policy",
  "announcement",
  "reels",
  "static"
] as const;

export type SeoPageType = (typeof SEO_PAGE_TYPES)[number];

export const SEO_DEFAULT_LOCALE = "vi";

export const SEO_DEFAULT_SITE_NAME = "ChapMee";

export const SEO_DEFAULT_TITLE_TEMPLATE = "{page_title} | ChapMee";

export const SEO_DEFAULT_DESCRIPTION_TEMPLATE =
  "ChapMee - Nền tảng giải trí text/story dành cho người đọc và tác giả.";

export const SEO_TITLE_SEPARATOR = "|";

/** Template variable names allowed in title/description templates. */
export const SEO_TEMPLATE_VARIABLES = [
  "site_name",
  "page_title",
  "story_title",
  "chapter_title",
  "author_name",
  "username",
  "genre",
  "genres",
  "chapter_count",
  "status",
  "year",
  "page",
  "taxonomy_name",
  "post_title",
  "post_excerpt",
  "short_description"
] as const;
