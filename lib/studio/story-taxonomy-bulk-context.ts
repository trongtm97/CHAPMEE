import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersistStoryTaxonomyInput } from "@/lib/creator/persist-story-taxonomy";
import type { StoryAgeRating } from "@/types/moderation";

export async function loadStoryTaxonomyBulkPersistInput(
  supabase: SupabaseClient,
  storyId: string
): Promise<PersistStoryTaxonomyInput> {
  const [linksResult, presentationResult, storyResult] = await Promise.all([
    supabase.from("story_taxonomy_terms").select("term_id").eq("story_id", storyId),
    supabase
      .from("story_presentation_settings")
      .select("mode")
      .eq("story_id", storyId)
      .maybeSingle(),
    supabase
      .from("stories")
      .select("age_rating, content_warnings_confirmed")
      .eq("id", storyId)
      .maybeSingle()
  ]);

  const taxonomyTermIds = (linksResult.data ?? []).map((row) => String(row.term_id));

  return {
    taxonomyTermIds,
    presentationMode: presentationResult.data?.mode
      ? String(presentationResult.data.mode)
      : "standard_prose",
    contentWarningsConfirmed: Boolean(storyResult.data?.content_warnings_confirmed),
    ageRating: (storyResult.data?.age_rating as StoryAgeRating) ?? "all_ages"
  };
}
