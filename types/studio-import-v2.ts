/** Bulk story import/export v2 — taxonomy slugs, story_code = public_code */

export const STORIES_IMPORT_V2_HEADERS = [
  "external_key",
  "story_code",
  "story_structure_type",
  "content_format",
  "title",
  "slug",
  "description",
  "content_type_slug",
  "main_genre_slug",
  "subgenre_slugs",
  "trope_tag_slugs",
  "setting_tag_slugs",
  "character_tag_slugs",
  "relationship_tag_slugs",
  "narrative_style_slugs",
  "reader_experience_slugs",
  "presentation_mode",
  "age_rating_slug",
  "has_content_warning",
  "content_warning_slugs",
  "status",
  "publish_at",
  "is_completed",
  "free_first_chapters_count",
  "auto_pricing_enabled",
  "auto_price_coin",
  "full_access_enabled",
  "full_access_price_coin",
  "full_access_includes_future_chapters",
  "default_new_chapter_price_coin",
  "full_access_note",
  "standalone_content",
  "standalone_content_json",
  "standalone_price"
] as const;

export const CHAPTERS_IMPORT_V2_HEADERS = [
  "external_key",
  "story_external_key",
  "story_code",
  "chapter_code",
  "chapter_order",
  "title",
  "slug",
  "content",
  "content_format",
  "structured_content_json",
  "validation_status",
  "presentation_mode",
  "status",
  "publish_at",
  "price_coin",
  "is_free"
] as const;

export const TAXONOMY_REFERENCE_HEADERS = [
  "type",
  "name",
  "slug",
  "description",
  "parent_slug",
  "max_select_hint"
] as const;

export type StoriesImportV2Row = Record<
  (typeof STORIES_IMPORT_V2_HEADERS)[number],
  string
>;

export type ChaptersImportV2Row = Record<
  (typeof CHAPTERS_IMPORT_V2_HEADERS)[number],
  string
>;

export type StoryImportV2Validation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  termIds: string[];
  presentationMode: string | null;
  hasContentWarning: boolean;
  contentWarningsConfirmed: boolean;
};
