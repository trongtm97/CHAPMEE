/**
 * Legacy story catalog fields kept for backward compatibility during taxonomy migration.
 * New code should read/write `story_taxonomy_terms` and `story_presentation_settings`.
 */

/** Composer-only presentation mode — not seeded as taxonomy term. */
export const COMPOSER_ONLY_PRESENTATION_MODES = ["branching_story"] as const;

/** @deprecated Prefer story_taxonomy_terms type main_genre */
export const DEPRECATED_STORY_GENRE_ID = "stories.genre_id" as const;

/** @deprecated Prefer story_taxonomy_terms trope_tag / subgenre */
export const DEPRECATED_STORY_TAGS = "story_tags" as const;

/** @deprecated Mirrored to taxonomy age_rating term; column kept for moderation queries */
export const DEPRECATED_STORY_AGE_RATING_COLUMN = "stories.age_rating" as const;

export const DEPRECATED_STORY_FIELDS = [
  DEPRECATED_STORY_GENRE_ID,
  DEPRECATED_STORY_TAGS,
  DEPRECATED_STORY_AGE_RATING_COLUMN
] as const;
