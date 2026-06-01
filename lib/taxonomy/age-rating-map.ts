import type { StoryAgeRating } from "@/types/moderation";

const VALID_AGE_RATINGS = new Set<StoryAgeRating>([
  "all_ages",
  "teen_13",
  "young_adult_16",
  "mature_18"
]);

/** Map taxonomy age_rating slug to stories.age_rating column. */
export function storyAgeRatingFromTaxonomySlug(slug: string): StoryAgeRating {
  const normalized = slug.trim() as StoryAgeRating;
  if (VALID_AGE_RATINGS.has(normalized)) {
    return normalized;
  }
  return "all_ages";
}
