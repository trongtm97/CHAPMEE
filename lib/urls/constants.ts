export const PUBLIC_CODE_MIN_LENGTH = 8;
export const PUBLIC_CODE_MAX_LENGTH = 12;
export const PUBLIC_CODE_DEFAULT_LENGTH = 10;

/** Numeric-only public code in URL suffix. */
export const NUMERIC_PUBLIC_CODE_REGEX = /^[0-9]{8,12}$/;

export const PUBLIC_ENTITY_TYPES = [
  "story",
  "chapter",
  "reel",
  "content_post",
  "announcement",
  "policy"
] as const;

export type PublicEntityType = (typeof PUBLIC_ENTITY_TYPES)[number];

/** Single-letter suffix prefix in URL path segments. */
export const ENTITY_CODE_PREFIX: Record<PublicEntityType, string> = {
  story: "s",
  chapter: "c",
  reel: "r",
  content_post: "p",
  announcement: "n",
  policy: "pl"
};

export const ENTITY_TABLE: Record<PublicEntityType, string> = {
  story: "stories",
  chapter: "episodes",
  reel: "reels_items",
  content_post: "admin_content_posts",
  announcement: "platform_announcements",
  policy: "policy_pages"
};

export const SLUG_MAX_LENGTH = 80;
