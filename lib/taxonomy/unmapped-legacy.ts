import { createClient } from "@/lib/supabase/server";
import {
  legacyFieldToTaxonomyType,
  suggestLegacyTaxonomyMapping,
  type LegacyField
} from "@/lib/taxonomy/legacy-mapping";
import type { TaxonomyType } from "@/types/taxonomy";

export type UnmappedLegacyStatus = "unresolved" | "mapped" | "ignored";

export type UnmappedLegacyRow = {
  field: LegacyField;
  legacyValue: string;
  storyCount: number;
  suggestedType: TaxonomyType | null;
  suggestedSlug: string | null;
  status: UnmappedLegacyStatus;
};

async function loadActiveTermKeys(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("type, slug")
    .eq("is_active", true);

  const keys = new Set<string>();
  for (const row of data ?? []) {
    keys.add(`${row.type}:${row.slug}`);
  }
  return keys;
}

function resolveStatus(
  field: LegacyField,
  value: string,
  termKeys: Set<string>
): Pick<UnmappedLegacyRow, "suggestedType" | "suggestedSlug" | "status"> {
  const suggestion = suggestLegacyTaxonomyMapping(field, value);
  if (!suggestion) {
    return { suggestedType: null, suggestedSlug: null, status: "unresolved" };
  }
  const key = `${suggestion.type}:${suggestion.slug}`;
  if (termKeys.has(key)) {
    return {
      suggestedType: suggestion.type,
      suggestedSlug: suggestion.slug,
      status: "mapped"
    };
  }
  return {
    suggestedType: suggestion.type,
    suggestedSlug: suggestion.slug,
    status: "unresolved"
  };
}

/**
 * Finds taxonomy gaps on live stories (legacy genres/tags tables removed).
 * Does not create terms — admin resolves via taxonomy UI or seed updates.
 */
export async function findUnmappedLegacyTaxonomyValues(): Promise<{
  rows: UnmappedLegacyRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const termKeys = await loadActiveTermKeys();
  const aggregates = new Map<string, { field: LegacyField; value: string; count: number }>();

  function bump(field: LegacyField, value: string, count: number) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = `${field}\0${trimmed}`;
    const existing = aggregates.get(key);
    if (existing) {
      existing.count += count;
    } else {
      aggregates.set(key, { field, value: trimmed, count });
    }
  }

  const { data: mainGenreLinks } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id")
    .eq("type", "main_genre");

  const storiesWithMainGenre = new Set(
    (mainGenreLinks ?? []).map((row) => String(row.story_id))
  );

  const { data: publicStories } = await supabase
    .from("stories")
    .select("id, title")
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .limit(5000);

  let missingMainGenre = 0;
  for (const story of publicStories ?? []) {
    if (!storiesWithMainGenre.has(String(story.id))) {
      missingMainGenre += 1;
    }
  }
  if (missingMainGenre > 0) {
    bump("genre", "Thiếu main_genre taxonomy", missingMainGenre);
  }

  const { data: tropeLinks } = await supabase
    .from("story_taxonomy_terms")
    .select("story_id")
    .in("type", ["trope_tag", "subgenre"]);

  const storiesWithTags = new Set(
    (tropeLinks ?? []).map((row) => String(row.story_id))
  );

  let missingTags = 0;
  for (const story of publicStories ?? []) {
    if (!storiesWithTags.has(String(story.id))) {
      missingTags += 1;
    }
  }
  if (missingTags > 0) {
    bump("tag", "Thiếu trope/subgenre taxonomy", missingTags);
  }

  const { data: ageStories } = await supabase
    .from("stories")
    .select("age_rating")
    .not("age_rating", "is", null);

  const ageCounts = new Map<string, number>();
  for (const row of ageStories ?? []) {
    const rating = String(row.age_rating);
    if (
      !termKeys.has(`age_rating:${rating}`) &&
      !termKeys.has(`age_rating:${rating.replace(/_/g, "-")}`)
    ) {
      ageCounts.set(rating, (ageCounts.get(rating) ?? 0) + 1);
    }
  }
  for (const [rating, count] of ageCounts) {
    bump("age_rating", rating, count);
  }

  const rows: UnmappedLegacyRow[] = [];
  for (const { field, value, count } of aggregates.values()) {
    if (count === 0) continue;
    const resolved = resolveStatus(field, value, termKeys);
    rows.push({
      field,
      legacyValue: value,
      storyCount: count,
      ...resolved
    });
  }

  rows.sort((a, b) => b.storyCount - a.storyCount || a.field.localeCompare(b.field));

  return { rows, error: null };
}

export function summarizeUnmappedLegacy(rows: UnmappedLegacyRow[]): {
  unresolved: number;
  mapped: number;
  totalStoriesAffected: number;
} {
  const unresolved = rows.filter((r) => r.status === "unresolved").length;
  const mapped = rows.filter((r) => r.status === "mapped").length;
  const totalStoriesAffected = rows
    .filter((r) => r.status === "unresolved")
    .reduce((sum, r) => sum + r.storyCount, 0);
  return { unresolved, mapped, totalStoriesAffected };
}

export { legacyFieldToTaxonomyType };
