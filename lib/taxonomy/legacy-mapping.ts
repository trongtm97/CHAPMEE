import { slugify } from "@/lib/slugify";
import type { TaxonomyType } from "@/types/taxonomy";

/**
 * Maps legacy catalog values to taxonomy term slugs.
 * Used by backfill and unmapped report — does NOT create new taxonomy terms.
 */

export type LegacyField =
  | "genre"
  | "category"
  | "tag"
  | "story_type"
  | "age_rating"
  | "content_warning"
  | "format"
  | "presentation_mode";

export type LegacyMappingTarget = {
  type: TaxonomyType;
  slug: string;
};

/** Explicit name/label → taxonomy slug overrides (case-insensitive keys). */
const LEGACY_NAME_TO_SLUG: Partial<
  Record<LegacyField, Record<string, string>>
> = {
  genre: {
    "ngôn tình": "ngon-tinh",
    "ngon tinh": "ngon-tinh",
    "kinh dị": "kinh-di",
    "kinh di": "kinh-di",
    "tiên hiệp": "tien-hiep",
    "tien hiep": "tien-hiep",
    "đô thị": "do-thi",
    "do thi": "do-thi",
    drama: "drama",
    "trinh thám": "trinh-tham",
    "trinh tham": "trinh-tham",
    "chữa lành": "chua-lanh",
    "chua lanh": "chua-lanh",
    "hài hước": "hai-huoc",
    "hai huoc": "hai-huoc",
    "học đường": "hoc-duong",
    "hoc duong": "hoc-duong",
    "xuyên không": "xuyen-khong",
    "xuyen khong": "xuyen-khong",
    "trọng sinh": "trong-sinh",
    "trong sinh": "trong-sinh",
    "tu tiên/fantasy": "tu-tien-fantasy",
    "bl/gl": "bl-gl",
    "chat story": "chat-story"
  },
  category: {
    "ngôn tình": "ngon-tinh",
    "kinh dị": "kinh-di",
    drama: "drama"
  },
  format: {
    "chat story": "chat-story",
    "văn xuôi": "standard_prose",
    "van xuoi": "standard_prose",
    "standard prose": "standard_prose",
    "social feed": "social_feed",
    "hồ sơ vụ án": "case_file",
    "ho so vu an": "case_file",
    "nhật ký": "diary",
    "nhat ky": "diary",
    "kịch bản": "script",
    "kich ban": "script"
  },
  presentation_mode: {
    "chat story": "chat_story",
    "chat-story": "chat_story",
    standard_prose: "standard_prose",
    chat_story: "chat_story",
    social_feed: "social_feed",
    case_file: "case_file",
    diary: "diary",
    system_game: "system_game",
    script: "script",
    mixed_media: "mixed_media"
  },
  age_rating: {
    all_ages: "all-ages",
    teen_13: "teen-13",
    young_adult_16: "young-adult-16",
    mature_18: "mature-18"
  }
};

const FIELD_TO_TAXONOMY_TYPE: Partial<Record<LegacyField, TaxonomyType>> = {
  genre: "main_genre",
  category: "main_genre",
  tag: "trope_tag",
  story_type: "content_type",
  age_rating: "age_rating",
  content_warning: "content_warning",
  format: "presentation_mode",
  presentation_mode: "presentation_mode"
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Suggest taxonomy target for a legacy value, or null if no rule matches. */
export function suggestLegacyTaxonomyMapping(
  field: LegacyField,
  rawValue: string
): LegacyMappingTarget | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const type = FIELD_TO_TAXONOMY_TYPE[field];
  if (!type) return null;

  const fieldMap = LEGACY_NAME_TO_SLUG[field];
  const normalized = normalizeKey(trimmed);

  if (fieldMap?.[normalized]) {
    return { type, slug: fieldMap[normalized]! };
  }

  // Slug-like values pass through for presentation_mode / age_rating columns.
  if (field === "presentation_mode" || field === "format") {
    const slugCandidate = trimmed.includes("_")
      ? trimmed
      : slugify(trimmed).replace(/-/g, "_");
    if (slugCandidate) {
      return { type: "presentation_mode", slug: slugCandidate };
    }
  }

  if (field === "age_rating") {
    return { type: "age_rating", slug: trimmed.replace(/_/g, "-") };
  }

  // Default: slugify name for genre/category/tag.
  if (field === "genre" || field === "category" || field === "tag") {
    const slug = slugify(trimmed);
    if (slug) return { type, slug };
  }

  return null;
}

export function legacyFieldToTaxonomyType(field: LegacyField): TaxonomyType | null {
  return FIELD_TO_TAXONOMY_TYPE[field] ?? null;
}

/** @deprecated Use story_taxonomy_terms — see lib/taxonomy/deprecated-fields.ts */
export const DEPRECATED_STORY_LEGACY_FIELDS = [
  "genre_id",
  "story_tags"
] as const;
