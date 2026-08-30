import type { DatabaseClient } from "@/lib/db/types";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";

export type PublicGenreFacet = {
  slug: string;
  name: string;
  story_count: number;
};

const PUBLIC_STATUSES = [...publicContentStatuses];

export async function hasTaxonomyMainGenres(db: DatabaseClient) {
  const { count } = await db
    .from("taxonomy_terms")
    .select("id", { count: "exact", head: true })
    .eq("type", "main_genre")
    .eq("is_active", true);

  return (count ?? 0) > 0;
}

export async function getPublicMainGenresWithStoryCounts(
  db: DatabaseClient
): Promise<PublicGenreFacet[]> {
  const { data: rpcRows, error: rpcError } = await db.rpc(
    "get_public_main_genres_with_story_counts"
  );

  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    return rpcRows.map((row) => ({
      slug: String((row as { slug: string }).slug),
      name: String((row as { name: string }).name),
      story_count: Number((row as { story_count: number }).story_count ?? 0)
    }));
  }

  const { data: terms, error } = await db
    .from("taxonomy_terms")
    .select("id, slug, name")
    .eq("type", "main_genre")
    .eq("is_active", true)
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !terms?.length) {
    return [];
  }

  const termIds = terms.map((row) => String(row.id));
  const { data: links } = await db
    .from("story_taxonomy_terms")
    .select("term_id, stories!inner(id, visibility, status)")
    .in("term_id", termIds)
    .eq("type", "main_genre")
    .eq("stories.visibility", "public")
    .in("stories.status", PUBLIC_STATUSES)
    .neq("stories.quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS);

  const counts = new Map<string, number>();
  for (const row of links ?? []) {
    const termId = String(row.term_id);
    counts.set(termId, (counts.get(termId) ?? 0) + 1);
  }

  return terms.map((term) => ({
    slug: String(term.slug),
    name: String(term.name),
    story_count: counts.get(String(term.id)) ?? 0
  }));
}

export async function getPublicMainGenreSlugs(db: DatabaseClient) {
  const genres = await getPublicMainGenresWithStoryCounts(db);
  return genres.filter((g) => g.story_count > 0).map((g) => g.slug);
}

/** @deprecated Use taxonomy term id via ranking-bridge. Returns main_genre term id for slug. */
export async function resolveMainGenreSlugToGenreId(
  db: DatabaseClient,
  genreSlug: string | null | undefined
): Promise<string | null> {
  if (!genreSlug) return null;

  const { data: term } = await db
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "main_genre")
    .eq("slug", genreSlug)
    .eq("is_active", true)
    .maybeSingle();

  return term?.id ? String(term.id) : null;
}

export async function getPublicStoryIdsForMainGenreSlug(
  db: DatabaseClient,
  genreSlug: string,
  limit = 120
): Promise<string[] | null> {
  const { data: term } = await db
    .from("taxonomy_terms")
    .select("id")
    .eq("type", "main_genre")
    .eq("slug", genreSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!term?.id) {
    return null;
  }

  const { data } = await db
    .from("story_taxonomy_terms")
    .select("story_id, stories!inner(id)")
    .eq("term_id", term.id)
    .eq("type", "main_genre")
    .eq("stories.visibility", "public")
    .in("stories.status", PUBLIC_STATUSES)
    .neq("stories.quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .limit(limit);

  const ids = [...new Set((data ?? []).map((row) => String(row.story_id)))];
  return ids;
}

export type PublicGenreStoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
};

export async function loadPublicStoriesForGenreSlug(
  db: DatabaseClient,
  genreSlug: string,
  limit = 20
): Promise<PublicGenreStoryRow[]> {
  const taxonomyIds = await getPublicStoryIdsForMainGenreSlug(
    db,
    genreSlug,
    limit
  );

  if (taxonomyIds && taxonomyIds.length > 0) {
    const { data } = await db
      .from("stories")
      .select("id, title, slug, public_code, hook, published_at")
      .in("id", taxonomyIds)
      .order("published_at", { ascending: false })
      .limit(limit);

    return (data ?? []) as PublicGenreStoryRow[];
  }

  return [];
}
