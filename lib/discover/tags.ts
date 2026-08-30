import { createPublicClient } from "@/lib/data/public-client";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";

/** Trope/subgenre display names from taxonomy (`story_taxonomy_terms`). */
export async function getTagsByStory(storyIds: string[]) {
  const tagsByStory = new Map<string, string[]>();

  if (storyIds.length === 0) {
    return tagsByStory;
  }

  const db = createPublicClient();
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

  for (const [storyId, labels] of taxonomyByStory) {
    const names = [...labels.subgenreNames, ...labels.tagNames];
    if (names.length > 0) {
      tagsByStory.set(storyId, names);
    }
  }

  return tagsByStory;
}
