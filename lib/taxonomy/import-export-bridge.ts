import { createClient } from "@/lib/supabase/server";
import { getSelectableTaxonomyTermsForCreator } from "@/lib/taxonomy/queries";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MainGenreImportExportOption = {
  id: string;
  name: string;
  slug: string;
};

export async function loadMainGenreOptionsForImportExport(): Promise<{
  options: MainGenreImportExportOption[];
  error: string | null;
}> {
  const result = await getSelectableTaxonomyTermsForCreator("main_genre");
  return {
    options: result.data.map((term) => ({
      id: term.id,
      name: term.display_label ?? term.name,
      slug: term.slug
    })),
    error: result.error
  };
}

/** Resolve import/export `story_genre` value (slug or display name) to taxonomy term id. */
export async function resolveMainGenreTermFromImportValue(
  supabase: SupabaseClient,
  raw: string
): Promise<string | null> {
  const value = raw.trim();
  if (!value) return null;

  const { data: bySlug } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "main_genre")
    .eq("slug", value)
    .eq("is_active", true)
    .maybeSingle();

  if (bySlug?.id) return String(bySlug.id);

  const { data: byName } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "main_genre")
    .ilike("name", value)
    .eq("is_active", true)
    .maybeSingle();

  return byName?.id ? String(byName.id) : null;
}

export async function getMainGenreSlugsByStoryIds(
  supabase: SupabaseClient,
  storyIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (storyIds.length === 0) return map;

  const { data } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id, taxonomy_terms(slug)")
    .in("story_id", storyIds)
    .eq("type", "main_genre");

  for (const row of data ?? []) {
    const term = row.taxonomy_terms as { slug: string } | { slug: string }[] | null;
    const rel = Array.isArray(term) ? term[0] : term;
    if (rel?.slug) {
      map.set(String(row.story_id), String(rel.slug));
    }
  }

  return map;
}

export async function getStoryIdsForMainGenreTermId(
  supabase: SupabaseClient,
  termId: string,
  creatorId: string
): Promise<string[]> {
  const { data: links } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id, stories!inner(id, creator_id)")
    .eq("term_id", termId)
    .eq("type", "main_genre")
    .eq("stories.creator_id", creatorId);

  return [...new Set((links ?? []).map((row) => String(row.story_id)))];
}

/** Set main_genre taxonomy link without wiping other taxonomy types. */
export async function applyMainGenreTermToStory(
  supabase: SupabaseClient,
  storyId: string,
  termId: string
): Promise<{ ok: boolean; error: string | null }> {
  const { error: deleteError } = await supabase
    .from("story_taxonomy_terms")
    .delete()
    .eq("story_id", storyId)
    .eq("type", "main_genre");

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const { error: insertError } = await supabase.from("story_taxonomy_terms").insert({
    story_id: storyId,
    term_id: termId,
    type: "main_genre"
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, error: null };
}

/** Server helper when createClient is not passed. */
export async function resolveMainGenreTermFromImportValueServer(raw: string) {
  const supabase = await createClient();
  return resolveMainGenreTermFromImportValue(supabase, raw);
}
