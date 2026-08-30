import type { DatabaseClient } from "@/lib/db/types";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { loadStoryMainGenreTermIndex } from "@/lib/ranking/story-main-genre-index";

export type StoryMainGenreLabels = {
  mainGenreName: string | null;
  mainGenreSlug: string | null;
};

/** Overlay main_genre taxonomy labels onto feed/ranking candidates keyed by story id. */
export async function loadMainGenreLabelsByStoryIds(
  db: DatabaseClient,
  storyIds: string[]
) {
  return getStoryTaxonomyLabelsByStoryIds(db, [...new Set(storyIds.filter(Boolean))]);
}

export function pickMainGenreFromLabels(labels: StoryMainGenreLabels | undefined) {
  return {
    genreName: labels?.mainGenreName ?? null,
    genreSlug: labels?.mainGenreSlug ?? null
  };
}

/** Distinct main_genre taxonomy terms used by a creator's stories (for studio/monetization filters). */
export async function loadCreatorMainGenreFilterOptions(
  db: DatabaseClient,
  creatorProfileId: string
): Promise<Array<{ id: string; name: string }>> {
  const { data: stories } = await db
    .from("stories")
    .select("id")
    .eq("creator_id", creatorProfileId);

  const storyIds = (stories ?? []).map((row) => String(row.id));
  if (storyIds.length === 0) {
    return [];
  }

  const mainGenreIndex = await loadStoryMainGenreTermIndex(db, storyIds);
  const termIds = [...new Set(mainGenreIndex.values())];
  if (termIds.length === 0) {
    return [];
  }

  const { data: terms } = await db
    .from("taxonomy_terms")
    .select("id, name")
    .in("id", termIds)
    .eq("type", "main_genre")
    .order("name");

  return (terms ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name)
  }));
}

export async function isTaxonomyMainGenreTermId(
  db: DatabaseClient,
  termId: string
) {
  if (!termId.trim()) return false;

  const { count } = await db
    .from("taxonomy_terms")
    .select("id", { count: "exact", head: true })
    .eq("id", termId)
    .eq("type", "main_genre");

  return (count ?? 0) > 0;
}

/** Genre + trope/subgenre labels for a story from taxonomy. */
export async function loadStoryCatalogDisplayLabels(
  db: DatabaseClient,
  storyId: string
): Promise<{ genreName: string | null; tagNames: string[] }> {
  const labelsMap = await getStoryTaxonomyLabelsByStoryIds(db, [storyId]);
  const labels = labelsMap.get(storyId);
  const picked = pickMainGenreFromLabels(labels);
  const tagNames = [...(labels?.subgenreNames ?? []), ...(labels?.tagNames ?? [])];

  return {
    genreName: picked.genreName,
    tagNames
  };
}
