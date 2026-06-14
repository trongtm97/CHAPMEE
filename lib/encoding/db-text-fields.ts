/**
 * Whitelist of PostgreSQL text fields safe for mojibake scan/repair.
 * Excludes slugs, URLs, object keys, tokens, and opaque JSON blobs.
 */

export type DbTextFieldSpec = {
  table: string;
  field: string;
  idColumn?: string;
  /** Skip rows where repaired text would change URL routing */
  repairable?: boolean;
};

const SKIP_FIELD_NAMES = new Set([
  "slug",
  "canonical_path",
  "canonical_url",
  "action_url",
  "source_url",
  "cover_url",
  "avatar_url",
  "background_image_url",
  "cover_image_url",
  "og_image_url",
  "twitter_image_url",
  "og_image_asset_id",
  "content_object_key",
  "object_key",
  "path",
  "public_code",
  "username",
  "icon",
  "color",
  "robots",
  "locale",
  "page_type",
  "target_type",
  "status",
  "type"
]);

function field(table: string, fieldName: string, repairable = true): DbTextFieldSpec {
  return {
    table,
    field: fieldName,
    idColumn: "id",
    repairable: repairable && !SKIP_FIELD_NAMES.has(fieldName)
  };
}

/** Tables/fields scanned by mojibake DB tools. */
export const DB_MOJIBAKE_TEXT_FIELDS: DbTextFieldSpec[] = [
  // Stories
  field("stories", "title"),
  field("stories", "hook"),
  field("stories", "short_description"),
  field("stories", "long_description"),
  field("stories", "seo_title"),
  field("stories", "seo_description"),
  field("stories", "standalone_plain_text"),
  field("stories", "rejection_note"),
  field("stories", "changes_requested_note"),
  field("stories", "admin_completion_note"),
  field("stories", "author_completion_request_note"),
  field("stories", "rights_review_note"),
  field("stories", "license_note"),
  field("stories", "source_title"),
  field("stories", "source_author_name"),
  field("stories", "free_access_reason"),
  field("stories", "monetization_disabled_reason"),

  // Episodes / chapters
  field("episodes", "title"),
  field("episodes", "excerpt"),
  field("episodes", "plain_text_preview"),
  field("episodes", "seo_title"),
  field("episodes", "seo_description"),
  field("episodes", "rejection_note"),
  field("episodes", "changes_requested_note"),
  field("episodes", "content", false), // large; scan only, repair off by default in repair script unless --field

  // Profiles
  field("profiles", "display_name"),
  field("profiles", "bio"),
  field("profiles", "verification_label"),
  field("profiles", "community_trust_note"),

  // Taxonomy
  field("taxonomy_terms", "name"),
  field("taxonomy_terms", "description"),
  field("taxonomy_terms", "display_label"),
  field("taxonomy_terms", "internal_note"),
  field("taxonomy_terms", "seo_title"),
  field("taxonomy_terms", "seo_description"),
  field("taxonomy_terms", "seo_h1"),
  field("taxonomy_terms", "seo_intro"),

  // SEO
  field("seo_content_blocks", "title"),
  field("seo_content_blocks", "summary"),
  field("seo_content_blocks", "content_markdown"),
  field("seo_overrides", "title"),
  field("seo_overrides", "meta_description"),
  field("seo_overrides", "og_title"),
  field("seo_overrides", "og_description"),
  field("seo_overrides", "twitter_title"),
  field("seo_overrides", "twitter_description"),

  // Community / comments
  // Note: comments.content and community_posts.title/content are now stored
  // in S3 by default (rows with content_storage_type='s3'). The inline
  // columns are NULLed out; only legacy 'db' rows still hold values.
  field("comments", "content", false),
  field("community_posts", "title", false),
  field("community_posts", "content", false),
  field("community_posts", "public_note"),
  field("community_posts", "hidden_reason"),
  field("community_posts", "rejected_reason"),
  field("community_posts", "comments_locked_reason"),

  // Notifications / announcements
  field("notifications", "title"),
  field("notifications", "body"),
  field("platform_announcements", "title"),
  field("platform_announcements", "body"),
  field("platform_announcements", "excerpt"),
  field("platform_announcements", "seo_title"),
  field("platform_announcements", "seo_description"),
  field("platform_announcements", "og_title"),
  field("platform_announcements", "og_description"),

  // Admin content posts / reels
  field("admin_content_posts", "title"),
  field("admin_content_posts", "excerpt"),
  field("admin_content_posts", "content"),
  field("admin_content_posts", "seo_title"),
  field("admin_content_posts", "seo_description"),
  field("admin_content_posts", "og_title"),
  field("admin_content_posts", "og_description"),
  // Reels text moved to S3 (rows with content_storage_type='s3' have NULL inline values).
  field("reels_items", "title", false),
  field("reels_items", "hook", false),
  field("reels_items", "body", false),
  field("reels_items", "cta", false)
];

export function getFieldsForTable(table?: string): DbTextFieldSpec[] {
  if (!table) return DB_MOJIBAKE_TEXT_FIELDS;
  return DB_MOJIBAKE_TEXT_FIELDS.filter((s) => s.table === table);
}

export function shouldRepairField(table: string, field: string): boolean {
  const spec = DB_MOJIBAKE_TEXT_FIELDS.find((s) => s.table === table && s.field === field);
  return spec?.repairable !== false;
}
