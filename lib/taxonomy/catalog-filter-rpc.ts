import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { TaxonomyType } from "@/types/taxonomy";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TaxonomyFilterGroup = {
  type: TaxonomyType;
  slugs: string[];
};

function parseSlugList(value?: string): string[] {
  if (!value?.trim()) return [];
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
}

/** Build AND groups from catalog params. ANY slug within each group (comma-separated). */
export function buildTaxonomyFilterGroups(
  params: StoryCatalogFilterParams
): TaxonomyFilterGroup[] {
  const groups: TaxonomyFilterGroup[] = [];

  const append = (type: TaxonomyType, slugField?: string) => {
    const slugs = parseSlugList(slugField);
    if (slugs.length > 0) {
      groups.push({ type, slugs });
    }
  };

  append("main_genre", params.genre);
  append("subgenre", params.subgenre);
  append("trope_tag", params.tag);
  append("character_tag", params.character);
  append("relationship_tag", params.relationship);
  append("narrative_style", params.narrativeStyle);
  append("setting_tag", params.setting);
  append("reader_experience", params.experience);
  append("content_type", params.contentType);
  append("age_rating", params.ageRating);
  append("monetization_access", params.monetization);
  append("content_warning", params.contentWarning);
  append("story_status", params.storyStatus);

  return groups;
}

export async function filterPublicStoryIdsByTaxonomyGroups(
  supabase: SupabaseClient,
  groups: TaxonomyFilterGroup[],
  limit = 5000
): Promise<string[]> {
  if (groups.length === 0) {
    return [];
  }

  const payload = groups.map((group) => ({
    type: group.type,
    slugs: group.slugs
  }));

  const { data, error } = await supabase.rpc(
    "filter_public_story_ids_by_taxonomy_groups",
    {
      filter_groups: payload,
      result_limit: limit
    }
  );

  if (error) {
    console.error("[catalog-filter-rpc] filter failed", error);
    return [];
  }

  return (data ?? []).map((row: { story_id: string }) => String(row.story_id));
}
