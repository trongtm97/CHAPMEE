import type { SupabaseClient } from "@supabase/supabase-js";

/** story_id → main_genre taxonomy term id */
export async function loadStoryMainGenreTermIndex(
  supabase: SupabaseClient,
  storyIds: string[]
): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  if (storyIds.length === 0) return index;

  const chunkSize = 400;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id, term_id")
      .in("story_id", chunk)
      .eq("type", "main_genre");

    if (error) throw error;

    for (const row of data ?? []) {
      index.set(String(row.story_id), String(row.term_id));
    }
  }

  return index;
}
