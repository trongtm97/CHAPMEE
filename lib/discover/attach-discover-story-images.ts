import "server-only";

import { loadCurrentStoryImagesByStoryIds } from "@/lib/images/get-current-story-image";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import { createPublicClient } from "@/lib/data/public-client";

/** Attach current story_images rows so portrait covers resolve on Discover. */
export async function attachDiscoverStoryImages(
  stories: DiscoverStory[]
): Promise<DiscoverStory[]> {
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
