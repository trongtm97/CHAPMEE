import type { SupabaseClient } from "@supabase/supabase-js";
import { loadStoryMainGenreTermIndex } from "@/lib/ranking/story-main-genre-index";

export type StoryTaxonomyScoringKeys = {
  genreTermId: string | null;
  tagTermIds: string[];
};

/** Taxonomy term ids used by scoring personal-fit (main_genre + trope/subgenre). */
export async function loadStoryTaxonomyKeysForScoring(
  supabase: SupabaseClient,
  storyIds: string[]
): Promise<Map<string, StoryTaxonomyScoringKeys>> {
  const map = new Map<string, StoryTaxonomyScoringKeys>();
  if (storyIds.length === 0) return map;

  const mainGenreIndex = await loadStoryMainGenreTermIndex(supabase, storyIds);

  const chunkSize = 400;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id, term_id, type")
      .in("story_id", chunk)
      .in("type", ["trope_tag", "subgenre"]);

    if (error) throw error;

    for (const storyId of chunk) {
      map.set(storyId, {
        genreTermId: mainGenreIndex.get(storyId) ?? null,
        tagTermIds: []
      });
    }

    for (const row of data ?? []) {
      const storyId = String(row.story_id);
      const entry = map.get(storyId);
      if (!entry) continue;
      entry.tagTermIds.push(String(row.term_id));
    }
  }

  return map;
}
