import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaxonomyType } from "@/types/taxonomy";

/** Discover/search prep: stories linked to a taxonomy term (by slug). */
export async function listPublishedStoryIdsByTaxonomySlug(
  supabase: SupabaseClient,
  type: TaxonomyType,
  slug: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 48;

  const { data: term } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("type", type)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!term?.id) {
    return { storyIds: [] as string[], error: null };
  }

  const { data, error } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id, stories!inner(id, status, visibility)")
    .eq("term_id", term.id)
    .eq("type", type)
    .limit(limit);

  if (error) {
    return { storyIds: [], error: error.message };
  }

  const storyIds = (data ?? [])
    .map((row) => {
      const story = row.stories as { id: string; status: string; visibility: string } | { id: string; status: string; visibility: string }[];
      const rel = Array.isArray(story) ? story[0] : story;
      if (!rel || rel.status !== "published" || rel.visibility !== "public") {
        return null;
      }
      return String(rel.id);
    })
    .filter((id): id is string => Boolean(id));

  return { storyIds: [...new Set(storyIds)], error: null };
}
