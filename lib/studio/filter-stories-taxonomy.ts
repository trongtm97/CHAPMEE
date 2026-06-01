import type { SupabaseClient } from "@supabase/supabase-js";

export type StudioTaxonomyListFilters = {
  mainGenreTermId?: string;
  subgenreTermId?: string;
  contentTypeTermId?: string;
  presentationMode?: string;
  ageRatingTermId?: string;
  hasContentWarning?: boolean;
};

export async function loadStoryIdsMatchingTaxonomyFilters(
  supabase: SupabaseClient,
  creatorStoryIds: string[],
  filters: StudioTaxonomyListFilters
): Promise<Set<string>> {
  if (creatorStoryIds.length === 0) {
    return new Set();
  }

  const activeFilters = [
    filters.mainGenreTermId,
    filters.subgenreTermId,
    filters.contentTypeTermId,
    filters.presentationMode,
    filters.ageRatingTermId,
    filters.hasContentWarning
  ].filter((v) => v !== undefined && v !== "");

  if (activeFilters.length === 0) {
    return new Set(creatorStoryIds);
  }

  let matching = new Set(creatorStoryIds);

  async function intersectByTerm(termId: string, type?: string) {
    let query = supabase
      .from("story_taxonomy_terms")
      .select("story_id")
      .in("story_id", [...matching])
      .eq("term_id", termId);
    if (type) query = query.eq("type", type);
    const { data } = await query;
    const ids = new Set((data ?? []).map((r) => String(r.story_id)));
    matching = new Set([...matching].filter((id) => ids.has(id)));
  }

  if (filters.mainGenreTermId) {
    await intersectByTerm(filters.mainGenreTermId, "main_genre");
  }
  if (filters.subgenreTermId) {
    await intersectByTerm(filters.subgenreTermId, "subgenre");
  }
  if (filters.contentTypeTermId) {
    await intersectByTerm(filters.contentTypeTermId, "content_type");
  }
  if (filters.ageRatingTermId) {
    await intersectByTerm(filters.ageRatingTermId, "age_rating");
  }

  if (filters.presentationMode?.trim()) {
    const { data } = await supabase
      .from("story_presentation_settings")
      .select("story_id")
      .in("story_id", [...matching])
      .eq("mode", filters.presentationMode.trim());

    const ids = new Set((data ?? []).map((r) => String(r.story_id)));
    matching = new Set([...matching].filter((id) => ids.has(id)));
  }

  if (filters.hasContentWarning === true) {
    const { data } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id")
      .in("story_id", [...matching])
      .eq("type", "content_warning");

    const ids = new Set((data ?? []).map((r) => String(r.story_id)));
    matching = new Set([...matching].filter((id) => ids.has(id)));
  } else if (filters.hasContentWarning === false) {
    const { data } = await supabase
      .from("story_taxonomy_terms")
      .select("story_id")
      .in("story_id", [...matching])
      .eq("type", "content_warning");

    const withWarnings = new Set((data ?? []).map((r) => String(r.story_id)));
    matching = new Set([...matching].filter((id) => !withWarnings.has(id)));
  }

  return matching;
}
