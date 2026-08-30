import "server-only";

import { loadCurrentStoryImagesByStoryIds } from "@/lib/images/get-current-story-image";
import { createPublicClient } from "@/lib/data/public-client";
import type { StoryCatalogStory } from "@/types/story";

/** Attach current story_images rows so portrait covers resolve in catalog cards. */
export async function attachCatalogStoryImages(
  stories: StoryCatalogStory[]
): Promise<StoryCatalogStory[]> {
  if (stories.length === 0) {
    return stories;
  }

  const db = createPublicClient();
  const imageByStoryId = await loadCurrentStoryImagesByStoryIds(
    db,
    stories.map((story) => story.id)
  );

  return stories.map((story) => ({
    ...story,
    currentImage: story.currentImage ?? imageByStoryId.get(story.id) ?? null
  }));
}
