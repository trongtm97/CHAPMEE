import type { SupabaseClient } from "@supabase/supabase-js";
import { isPresentationModeSupportedByComposer } from "@/lib/taxonomy/presentation-bridge";

/**
 * Keeps `story_taxonomy_terms` presentation_mode link aligned with
 * `story_presentation_settings.mode` (canonical runtime for Composer).
 */
export async function syncPresentationModeTaxonomyLink(
  supabase: SupabaseClient,
  storyId: string,
  mode: string | null | undefined
): Promise<{ error: string | null }> {
  await supabase
    .from("story_taxonomy_terms")
    .delete()
    .eq("story_id", storyId)
    .eq("type", "presentation_mode");

  const normalized = (mode ?? "").trim();
  if (!normalized || !isPresentationModeSupportedByComposer(normalized)) {
    return { error: null };
  }

  const { data: term, error: termError } = await supabase
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "presentation_mode")
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (termError) {
    return { error: termError.message };
  }

  if (!term?.id) {
    return { error: null };
  }

  const { error: insertError } = await supabase.from("story_taxonomy_terms").insert({
    story_id: storyId,
    term_id: String(term.id),
    type: "presentation_mode"
  });

  return { error: insertError?.message ?? null };
}
