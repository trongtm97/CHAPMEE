import { createClient } from "@/lib/data/server";
import {
  mapFormatTemplateRow,
  mapPresentationSettingsRow
} from "@/lib/taxonomy/map-row";
import { getActiveTaxonomyTerms } from "@/lib/taxonomy/queries";
import type {
  StoryFormatTemplateRow,
  StoryPresentationSettingsRow
} from "@/types/taxonomy";

export async function getPresentationModes(): Promise<{
  data: string[];
  error: string | null;
}> {
  const result = await getActiveTaxonomyTerms("presentation_mode");
  if (result.error) {
    return { data: [], error: result.error };
  }
  return {
    data: result.data.map((term) => term.slug),
    error: null
  };
}

export async function getPresentationTemplates(mode: string): Promise<{
  data: StoryFormatTemplateRow[];
  error: string | null;
}> {
  const db = await createClient();
  const { data, error } = await db
    .from("story_format_templates")
    .select("*")
    .eq("mode", mode)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: ((data ?? []) as Record<string, unknown>[]).map((row) =>
      mapFormatTemplateRow(row)
    ),
    error: null
  };
}

export async function getStoryPresentationSettings(storyId: string): Promise<{
  data: StoryPresentationSettingsRow | null;
  error: string | null;
}> {
  const db = await createClient();
  const { data, error } = await db
    .from("story_presentation_settings")
    .select("*")
    .eq("story_id", storyId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: data
      ? mapPresentationSettingsRow(data as unknown as Record<string, unknown>)
      : null,
    error: null
  };
}
