import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { groupTermsByType } from "@/lib/taxonomy/map-row";
import { syncPresentationModeTaxonomyLink } from "@/lib/taxonomy/presentation-taxonomy-sync";
import { getTaxonomyTermsByIds } from "@/lib/taxonomy/queries";
import { validateStoryTaxonomySelection } from "@/lib/taxonomy/validation";
import type {
  StoryTaxonomyByType,
  StoryTaxonomySelectionInput,
  TaxonomyType
} from "@/types/taxonomy";
import {
  getStoryTaxonomyTermIds,
  updateTaxonomyUsageForStory
} from "@/lib/taxonomy/usage-count";

export async function getStoryTaxonomy(storyId: string): Promise<{
  data: StoryTaxonomyByType;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("story_taxonomy_terms")
    .select("*")
    .eq("story_id", storyId);

  if (error) {
    return { data: {}, error: error.message };
  }

  const termIds = (links ?? []).map((row) => String(row.term_id));
  const termsResult = await getTaxonomyTermsByIds(termIds);
  if (termsResult.error) {
    return { data: {}, error: termsResult.error };
  }

  return { data: groupTermsByType(termsResult.data), error: null };
}

export async function setStoryTaxonomy(
  storyId: string,
  input: StoryTaxonomySelectionInput,
  options?: { forPublish?: boolean; allowAdminTypes?: boolean }
): Promise<{ ok: boolean; error: string | null }> {
  const validation = await validateStoryTaxonomySelection(input, options);
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join(" ") };
  }

  const supabase = await createClient();

  const oldTermIds = await getStoryTaxonomyTermIds(supabase, storyId);

  const { error: deleteError } = await supabase
    .from("story_taxonomy_terms")
    .delete()
    .eq("story_id", storyId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const inserts = Object.entries(validation.normalized).flatMap(
    ([type, ids]) =>
      (ids ?? []).map((termId) => ({
        story_id: storyId,
        term_id: termId,
        type: type as TaxonomyType
      }))
  );

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("story_taxonomy_terms")
      .insert(inserts);

    if (insertError) {
      return { ok: false, error: insertError.message };
    }
  }

  if (input.contentWarningsConfirmed !== undefined) {
    const { error: confirmError } = await supabase
      .from("stories")
      .update({ content_warnings_confirmed: input.contentWarningsConfirmed })
      .eq("id", storyId);

    if (confirmError) {
      return { ok: false, error: confirmError.message };
    }
  }

  if (input.presentationMode) {
    const { error: presentationError } = await supabase
      .from("story_presentation_settings")
      .upsert(
        {
          story_id: storyId,
          mode: input.presentationMode,
          template_id: input.formatTemplateId ?? null
        },
        { onConflict: "story_id" }
      );

    if (presentationError) {
      return { ok: false, error: presentationError.message };
    }

    const syncPresentation = await syncPresentationModeTaxonomyLink(
      supabase,
      storyId,
      input.presentationMode
    );
    if (syncPresentation.error) {
      return { ok: false, error: syncPresentation.error };
    }
  }

  const newTermIds = inserts.map((row) => String(row.term_id));
  const usageUpdate = await updateTaxonomyUsageForStory(
    supabase,
    storyId,
    oldTermIds,
    newTermIds
  );
  if (!usageUpdate.ok) {
    return { ok: false, error: usageUpdate.error };
  }

  return { ok: true, error: null };
}

/** Convenience: set taxonomy from a flat list of term ids. */
export async function setStoryTaxonomyTermIds(
  storyId: string,
  termIds: string[],
  options?: {
    forPublish?: boolean;
    allowAdminTypes?: boolean;
    contentWarningsConfirmed?: boolean;
    presentationMode?: string | null;
  }
): Promise<{ ok: boolean; error: string | null }> {
  if (termIds.length === 0) {
    return setStoryTaxonomy(
      storyId,
      {
        selections: {},
        contentWarningsConfirmed: options?.contentWarningsConfirmed,
        presentationMode: options?.presentationMode
      },
      options
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .in("id", termIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  const selections: Partial<Record<TaxonomyType, string[]>> = {};
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const type = String(row.type) as TaxonomyType;
    if (!selections[type]) selections[type] = [];
    selections[type]!.push(String(row.id));
  }

  return setStoryTaxonomy(
    storyId,
    {
      selections,
      contentWarningsConfirmed: options?.contentWarningsConfirmed,
      presentationMode: options?.presentationMode
    },
    options
  );
}

/** Copy taxonomy links + presentation settings when duplicating a story. */
export async function copyStoryTaxonomyFromStory(
  supabase: SupabaseClient,
  sourceStoryId: string,
  targetStoryId: string
): Promise<{ ok: boolean; error: string | null }> {
  const [linksResult, presentationResult, storyRow] = await Promise.all([
    supabase
      .from("story_taxonomy_terms")
      .select("term_id, type")
      .eq("story_id", sourceStoryId),
    supabase
      .from("story_presentation_settings")
      .select("mode, template_id")
      .eq("story_id", sourceStoryId)
      .maybeSingle(),
    supabase
      .from("stories")
      .select("content_warnings_confirmed, age_rating")
      .eq("id", sourceStoryId)
      .maybeSingle()
  ]);

  if (linksResult.error) {
    return { ok: false, error: linksResult.error.message };
  }

  const inserts = (linksResult.data ?? []).map((row) => ({
    story_id: targetStoryId,
    term_id: String(row.term_id),
    type: String(row.type)
  }));

  if (inserts.length > 0) {
    const { error } = await supabase.from("story_taxonomy_terms").insert(inserts);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  if (presentationResult.data?.mode) {
    const { error } = await supabase.from("story_presentation_settings").upsert({
      story_id: targetStoryId,
      mode: presentationResult.data.mode,
      template_id: presentationResult.data.template_id ?? null
    });
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  if (storyRow.data) {
    await supabase
      .from("stories")
      .update({
        content_warnings_confirmed: storyRow.data.content_warnings_confirmed,
        age_rating: storyRow.data.age_rating
      })
      .eq("id", targetStoryId);
  }

  return { ok: true, error: null };
}
