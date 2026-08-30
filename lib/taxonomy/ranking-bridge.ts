import type { DatabaseClient } from "@/lib/db/types";

export type TaxonomyMainGenreBoardKey = {
  termId: string;
  slug: string;
  name: string;
};

export async function listTaxonomyMainGenresForRanking(
  db: DatabaseClient
): Promise<TaxonomyMainGenreBoardKey[]> {
  const { data: terms, error } = await db
    .from("taxonomy_terms")
    .select("id, slug, name")
    .eq("type", "main_genre")
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_ranking", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !terms?.length) {
    return [];
  }

  return terms.map((term) => ({
    termId: String(term.id),
    slug: String(term.slug),
    name: String(term.name)
  }));
}

export async function resolveMainGenreTermBySlug(
  db: DatabaseClient,
  genreSlug: string | null | undefined
) {
  if (!genreSlug) return null;

  const { data } = await db
    .from("taxonomy_terms")
    .select("id, slug, name")
    .eq("type", "main_genre")
    .eq("slug", genreSlug)
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_ranking", true)
    .maybeSingle();

  if (!data?.id) return null;

  return {
    termId: String(data.id),
    slug: String(data.slug),
    name: String(data.name)
  };
}
