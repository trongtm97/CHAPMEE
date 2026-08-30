import type { DatabaseClient } from "@/lib/db/types";

export type StoryTaxonomyMeta = {
  mainGenreTermId: string | null;
  taxonomyTermIds: string[];
  presentationModeSlug: string | null;
};

export async function loadStoryTaxonomyBatch(
  db: DatabaseClient,
  storyIds: string[]
): Promise<Map<string, StoryTaxonomyMeta>> {
  const map = new Map<string, StoryTaxonomyMeta>();
  if (storyIds.length === 0) return map;

  const unique = [...new Set(storyIds.filter(Boolean))];
  const { data } = await db
    .from("story_taxonomy_terms")
    .select("story_id, term_id, type, taxonomy_terms(slug)")
    .in("story_id", unique);

  for (const storyId of unique) {
    map.set(storyId, {
      mainGenreTermId: null,
      taxonomyTermIds: [],
      presentationModeSlug: null
    });
  }

  for (const row of data ?? []) {
    const storyId = String(row.story_id);
    const entry = map.get(storyId);
    if (!entry) continue;

    const termId = String(row.term_id);
    entry.taxonomyTermIds.push(termId);

    const type = String(row.type ?? "");
    const termRel = row.taxonomy_terms as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(termRel) ? termRel[0]?.slug : termRel?.slug;

    if (type === "main_genre") {
      entry.mainGenreTermId = termId;
    }
    if (type === "presentation_mode" && slug) {
      entry.presentationModeSlug = slug;
    }
  }

  return map;
}

export async function loadTaxonomyExposureShare(
  db: DatabaseClient,
  surface: string,
  days = 7
): Promise<Map<string, number>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data } = await db
    .from("taxonomy_exposure_daily")
    .select("term_id, impressions")
    .eq("surface", surface)
    .gte("date", sinceDate);

  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const row of data ?? []) {
    const termId = String(row.term_id);
    const impressions = Number(row.impressions ?? 0);
    totals.set(termId, (totals.get(termId) ?? 0) + impressions);
    grandTotal += impressions;
  }

  if (grandTotal <= 0) {
    return new Map();
  }

  const shares = new Map<string, number>();
  for (const [termId, impressions] of totals) {
    shares.set(termId, (impressions / grandTotal) * 100);
  }
  return shares;
}
