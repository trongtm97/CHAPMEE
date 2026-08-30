import "server-only";

import { createPublicClient } from "@/lib/data/public-client";
import type { StoryCatalogStory } from "@/types/story";

let publishedFilmStoryIdsCache: Set<string> | null = null;
let publishedFilmStoryIdsCacheAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Story IDs with at least one published film adaptation (for catalog filter + badges).
 */
export async function getStoryIdsWithPublishedFilm(): Promise<string[]> {
  const now = Date.now();
  if (publishedFilmStoryIdsCache && now - publishedFilmStoryIdsCacheAt < CACHE_TTL_MS) {
    return [...publishedFilmStoryIdsCache];
  }

  const db = createPublicClient();
  const { data, error } = await db
    .from("story_film_adaptations")
    .select("story_id")
    .eq("status", "published");

  if (error) {
    console.error("[film-card-summary] failed to load published films", error.message);
    return [];
  }

  const ids = [...new Set((data ?? []).map((row) => String(row.story_id)))];
  publishedFilmStoryIdsCache = new Set(ids);
  publishedFilmStoryIdsCacheAt = now;
  return ids;
}

export async function enrichStoriesWithFilmCardSummary(
  stories: StoryCatalogStory[]
): Promise<StoryCatalogStory[]> {
  if (stories.length === 0) {
    return stories;
  }

  const publishedIds = new Set(await getStoryIdsWithPublishedFilm());
  return stories.map((story) => ({
    ...story,
    hasPublishedVideo: publishedIds.has(story.id)
  }));
}
