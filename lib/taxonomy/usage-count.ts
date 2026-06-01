import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStoryTaxonomyTermIds(
  supabase: SupabaseClient,
  storyId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("story_taxonomy_terms")
    .select("term_id")
    .eq("story_id", storyId);

  return (data ?? []).map((row) => String(row.term_id));
}

/** Increment/decrement usage_count by term delta instead of full table scan. */
export async function updateTaxonomyUsageForStory(
  supabase: SupabaseClient,
  storyId: string,
  oldTermIds: string[],
  newTermIds: string[]
): Promise<{ ok: boolean; error: string | null }> {
  const oldSet = new Set(oldTermIds);
  const newSet = new Set(newTermIds);
  const removed = oldTermIds.filter((id) => !newSet.has(id));
  const added = newTermIds.filter((id) => !oldSet.has(id));

  if (removed.length === 0 && added.length === 0) {
    return { ok: true, error: null };
  }

  const { error } = await supabase.rpc("apply_taxonomy_usage_count_delta", {
    removed_term_ids: removed,
    added_term_ids: added
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

/** Full recount — admin/cron only; avoid on hot paths. */
export async function recalculateTaxonomyUsageCounts(
  supabase: SupabaseClient
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc("refresh_taxonomy_usage_counts");
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
