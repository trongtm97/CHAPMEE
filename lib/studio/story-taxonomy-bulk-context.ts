import type { DatabaseClient } from "@/lib/db/types";
import type { PersistStoryTaxonomyInput } from "@/lib/creator/persist-story-taxonomy";
import type { StoryAgeRating } from "@/types/moderation";

export async function loadStoryTaxonomyBulkPersistInput(
  db: DatabaseClient,
  storyId: string
): Promise<PersistStoryTaxonomyInput> {
  const [linksResult, presentationResult, storyResult] = await Promise.all([
    db.from("story_taxonomy_terms").select("term_id").eq("story_id", storyId),
    db
      .from("story_presentation_settings")
      .select("mode")
      .eq("story_id", storyId)
      .maybeSingle(),
    db
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
