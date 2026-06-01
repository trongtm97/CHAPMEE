import { createPublicClient } from "@/lib/supabase/public-client";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";

/** Trope/subgenre display names from taxonomy (`story_taxonomy_terms`). */
export async function getTagsByStory(storyIds: string[]) {
  const tagsByStory = new Map<string, string[]>();

  if (storyIds.length === 0) {
    return tagsByStory;
  }

  const supabase = createPublicClient();
  const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, storyIds);

  for (const [storyId, labels] of taxonomyByStory) {
    const names = [...labels.subgenreNames, ...labels.tagNames];
    if (names.length > 0) {
      tagsByStory.set(storyId, names);
    }
  }

  return tagsByStory;
}
