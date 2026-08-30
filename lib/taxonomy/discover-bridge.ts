import type { DatabaseClient } from "@/lib/db/types";

export type TaxonomyGenreFacet = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

/** Prefer taxonomy main_genre for Discover genre chips when seeded. */
export async function loadDiscoverGenresFromTaxonomy(
  db: DatabaseClient
): Promise<TaxonomyGenreFacet[]> {
  const { getPublicMainGenresWithStoryCounts } = await import(
    "@/lib/taxonomy/public-genres"
  );
  const genres = await getPublicMainGenresWithStoryCounts(db);
  return genres.map((genre) => ({
    id: genre.slug,
    name: genre.name,
    slug: genre.slug,
    description: null
  }));
}

export async function getStoryTaxonomyLabelsByStoryIds(
  db: DatabaseClient,
  storyIds: string[]
) {
  if (storyIds.length === 0) {
    return new Map<
      string,
      {
        mainGenreName: string | null;
        mainGenreSlug: string | null;
        contentTypeName: string | null;
        subgenreNames: string[];
        tagNames: string[];
        contentWarningNames: string[];
        presentationMode: string | null;
        ageRatingName: string | null;
        storyStatusNames: string[];
      }
    >();
  }

  const { data } = await db
    .from("story_taxonomy_terms")
    .select("story_id, type, taxonomy_terms(name, slug)")
    .in("story_id", storyIds);

  const map = new Map<
    string,
    {
      mainGenreName: string | null;
      mainGenreSlug: string | null;
      contentTypeName: string | null;
      subgenreNames: string[];
      tagNames: string[];
      contentWarningNames: string[];
      presentationMode: string | null;
      ageRatingName: string | null;
      storyStatusNames: string[];
    }
  >();

  for (const storyId of storyIds) {
    map.set(storyId, {
      mainGenreName: null,
      mainGenreSlug: null,
      contentTypeName: null,
      subgenreNames: [],
      tagNames: [],
      contentWarningNames: [],
      presentationMode: null,
      ageRatingName: null,
      storyStatusNames: []
    });
  }

  for (const row of data ?? []) {
    const storyId = String(row.story_id);
    const entry = map.get(storyId)!;
    if (!entry) continue;
    const term = row.taxonomy_terms as
      | { name: string; slug: string }
      | { name: string; slug: string }[]
      | null;
    const rel = Array.isArray(term) ? term[0] : term;
    if (!rel) continue;

    if (row.type === "main_genre") {
      entry.mainGenreName = rel.name;
      entry.mainGenreSlug = rel.slug;
    } else if (row.type === "content_type") {
      entry.contentTypeName = rel.name;
    } else if (row.type === "subgenre") {
      if (!entry.subgenreNames.includes(rel.name)) {
        entry.subgenreNames.push(rel.name);
      }
    } else if (row.type === "trope_tag") {
      if (!entry.tagNames.includes(rel.name)) {
        entry.tagNames.push(rel.name);
      }
    } else if (row.type === "presentation_mode") {
      entry.presentationMode = rel.slug;
    } else if (row.type === "age_rating") {
      entry.ageRatingName = rel.name;
    } else if (row.type === "story_status") {
      if (!entry.storyStatusNames.includes(rel.name)) {
        entry.storyStatusNames.push(rel.name);
      }
    } else if (row.type === "content_warning") {
      if (!entry.contentWarningNames.includes(rel.name)) {
        entry.contentWarningNames.push(rel.name);
      }
    }
  }

  const { data: presentationRows } = await db
    .from("story_presentation_settings")
    .select("story_id, mode")
    .in("story_id", storyIds);

  for (const row of presentationRows ?? []) {
    const storyId = String(row.story_id);
    const entry = map.get(storyId);
    if (entry && !entry.presentationMode && row.mode) {
      entry.presentationMode = String(row.mode);
    }
  }

  return map;
}
