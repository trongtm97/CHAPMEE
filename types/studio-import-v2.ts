/** Bulk story import/export v2 — story_code = public_code */

import type {
  ContentOrigin,
  TranslationType
} from "@/lib/content-origin/content-origin-types";

/** Cột xuất / mẫu — trường người dùng điền trên form Studio */
export const STORIES_IMPORT_V2_HEADERS = [
  "story_code",
  "story_structure_type",
  "content_format",
  "title",
  "slug",
  "hook",
  "description",
  "long_description",
  "cover_url",
  "seo_title",
  "seo_description",
  "content_origin",
  "source_title",
  "source_author_name",
  "original_language",
  "source_url",
  "translation_type",
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

/** Cột hệ thống — vẫn đọc file cũ, không xuất trong template */
export const STORIES_IMPORT_V2_SYSTEM_FIELDS = ["external_key", "status"] as const;

export const STORIES_IMPORT_V2_ALL_FIELDS = [
  ...STORIES_IMPORT_V2_HEADERS,
  ...STORIES_IMPORT_V2_SYSTEM_FIELDS
] as const;

export const CHAPTERS_IMPORT_V2_HEADERS = [
  "story_code",
  "chapter_code",
  "chapter_order",
  "title",
  "content",
  "structured_content_json",
  "presentation_mode",
  "status",
  "publish_at",
  "price_coin",
  "is_free"
] as const;

export const CHAPTERS_IMPORT_V2_SYSTEM_FIELDS = [
  "external_key",
  "story_external_key",
  "slug",
  "content_format",
  "validation_status"
] as const;

export const CHAPTERS_IMPORT_V2_ALL_FIELDS = [
  ...CHAPTERS_IMPORT_V2_HEADERS,
  ...CHAPTERS_IMPORT_V2_SYSTEM_FIELDS
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
  (typeof STORIES_IMPORT_V2_ALL_FIELDS)[number],
  string
>;

export type ChaptersImportV2Row = Record<
  (typeof CHAPTERS_IMPORT_V2_ALL_FIELDS)[number],
  string
>;

export type StoryImportV2Validation = {
  canImport: boolean;
  ok: boolean;
  blockingErrors: string[];
  errors: string[];
  warnings: string[];
  skippedFields: string[];
  termIds: string[];
  presentationMode: string | null;
  hasContentWarning: boolean;
  contentWarningsConfirmed: boolean;
  contentOrigin: ContentOrigin;
  originalLanguage: string | null;
  sourceUrl: string | null;
  translationType: TranslationType;
  ageRatingSlug: string | null;
};
