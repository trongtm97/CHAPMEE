import { createClient } from "@/lib/supabase/server";
import { getStoryTaxonomy } from "@/lib/taxonomy/story-taxonomy";
import { getSelectableTaxonomyTermsForCreator } from "@/lib/taxonomy/queries";
import {
  getPresentationTemplates,
  getStoryPresentationSettings
} from "@/lib/taxonomy/presentation";
import { getComposerAdminSettings } from "@/lib/composer/composer-settings";
import { getComposerModeFromPresentationTerm } from "@/lib/taxonomy/presentation-bridge";
import {
  CREATOR_ASSIGNABLE_TAXONOMY_TYPES,
  PRESENTATION_MODE_SLUGS
} from "@/lib/taxonomy/constants";
import type { StoryFormatTemplateRow, TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

export type StoryFormTaxonomyOptions = Partial<
  Record<TaxonomyType, TaxonomyTerm[]>
>;

export type StoryFormTaxonomySelection = Partial<
  Record<TaxonomyType, string[]>
>;

export type StoryFormFormatTemplateOption = {
  id: string;
  name: string;
  description: string | null;
  exampleJson: Record<string, unknown> | null;
};

export type StoryFormTaxonomyBundle = {
  enabled: boolean;
  optionsByType: StoryFormTaxonomyOptions;
  selectedByType: StoryFormTaxonomySelection;
  presentationMode: string | null;
  formatTemplatesByMode: Partial<Record<string, StoryFormFormatTemplateOption[]>>;
  selectedFormatTemplateId: string | null;
  contentWarningsConfirmed: boolean;
};

const STUDIO_FORM_TAXONOMY_TYPES: TaxonomyType[] = [
  "content_type",
  "main_genre",
  "subgenre",
  "trope_tag",
  "setting_tag",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "presentation_mode",
  "reader_experience",
  "content_warning",
  "age_rating"
];

export async function getStoryFormTaxonomyBundle(
  storyId?: string,
  options?: { contentWarningsConfirmed?: boolean }
): Promise<StoryFormTaxonomyBundle> {
  const composerSettings = await getComposerAdminSettings();
  const creatorModeSet = new Set(
    composerSettings.modes
      .filter((mode) => mode.is_active && mode.is_creator_selectable)
      .map((mode) => mode.mode)
  );

  const optionResults = await Promise.all(
    STUDIO_FORM_TAXONOMY_TYPES.map(async (type) => {
      const result = await getSelectableTaxonomyTermsForCreator(type);
      const terms =
        type === "presentation_mode"
          ? result.data.filter((term) =>
              creatorModeSet.has(getComposerModeFromPresentationTerm(term.slug))
            )
          : result.data;
      return { type, terms, error: result.error };
    })
  );

  const templateResults = await Promise.all(
    PRESENTATION_MODE_SLUGS.map(async (mode) => {
      const result = await getPresentationTemplates(mode);
      return { mode, templates: result.data };
    })
  );

  const formatTemplatesByMode: Partial<
    Record<string, StoryFormFormatTemplateOption[]>
  > = {};
  for (const row of templateResults) {
    if (row.templates.length > 0 && creatorModeSet.has(getComposerModeFromPresentationTerm(row.mode))) {
      formatTemplatesByMode[row.mode] = row.templates.map(mapTemplateOption);
    }
  }

  const hasTerms = optionResults.some((row) => row.terms.length > 0);
  if (!hasTerms) {
    return {
      enabled: false,
      optionsByType: {},
      selectedByType: {},
      presentationMode: "standard_prose",
      formatTemplatesByMode,
      selectedFormatTemplateId: null,
      contentWarningsConfirmed: options?.contentWarningsConfirmed ?? false
    };
  }

  const optionsByType: StoryFormTaxonomyOptions = {};
  for (const row of optionResults) {
    if (row.terms.length > 0) {
      optionsByType[row.type] = row.terms;
    }
  }

  const selectedByType: StoryFormTaxonomySelection = {};
  let presentationMode: string | null = "standard_prose";
  let selectedFormatTemplateId: string | null = null;
  let contentWarningsConfirmed = options?.contentWarningsConfirmed ?? false;

  if (storyId) {
    const supabase = await createClient();
    const [taxonomyResult, presentationResult, storyRow] = await Promise.all([
      getStoryTaxonomy(storyId),
      getStoryPresentationSettings(storyId),
      supabase
        .from("stories")
        .select("content_warnings_confirmed")
        .eq("id", storyId)
        .maybeSingle()
    ]);

    if (storyRow.data?.content_warnings_confirmed) {
      contentWarningsConfirmed = true;
    }

    for (const type of CREATOR_ASSIGNABLE_TAXONOMY_TYPES) {
      const terms = taxonomyResult.data[type];
      if (terms?.length) {
        selectedByType[type] = terms.map((term) => term.id);
      }
    }

    presentationMode = presentationResult.data?.mode ?? presentationMode;
    selectedFormatTemplateId = presentationResult.data?.template_id ?? null;
  }

  return {
    enabled: true,
    optionsByType,
    selectedByType,
    presentationMode,
    formatTemplatesByMode,
    selectedFormatTemplateId,
    contentWarningsConfirmed
  };
}

function mapTemplateOption(row: StoryFormatTemplateRow): StoryFormFormatTemplateOption {
  const example =
    row.example_json && Object.keys(row.example_json).length > 0
      ? row.example_json
      : null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    exampleJson: example
  };
}
