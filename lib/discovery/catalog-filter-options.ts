import { createPublicClient } from "@/lib/supabase/public-client";
import { getCachedDiscoverTaxonomyTerms } from "@/lib/taxonomy/cache";
import { getPublicMainGenresWithStoryCounts } from "@/lib/taxonomy/public-genres";import type { CatalogFilterFacet, CatalogFilterOptions } from "@/lib/discovery/types";
import type { TaxonomyType } from "@/types/taxonomy";

function toFacets(
  terms: Array<{ slug: string; name: string; usage_count?: number }>
): CatalogFilterFacet[] {
  return terms.map((term) => ({
    slug: term.slug,
    name: term.name,
    storyCount: term.usage_count
  }));
}

async function loadFacetType(type: TaxonomyType, limit = 40) {
  const terms = await getCachedDiscoverTaxonomyTerms(type, { limit });
  return toFacets(terms);
}
export async function getCatalogFilterOptions(): Promise<CatalogFilterOptions> {
  const supabase = createPublicClient();
  const genreRows = await getPublicMainGenresWithStoryCounts(supabase);
  const genres: CatalogFilterFacet[] = genreRows.map((row) => ({
    slug: row.slug,
    name: row.name,
    storyCount: row.story_count
  }));

  const featured = await getCachedDiscoverTaxonomyTerms("main_genre", { limit: 8 });
  const featuredGenreSlugs = featured.map((term) => term.slug);
  const [
    subgenres,
    tags,
    characters,
    relationships,
    narrativeStyles,
    settings,
    experiences,
    presentations,
    contentTypes,
    ageRatings,
    monetizationAccess,
    contentWarnings,
    storyStatuses
  ] = await Promise.all([
    loadFacetType("subgenre", 30),
    loadFacetType("trope_tag", 40),
    loadFacetType("character_tag", 24),
    loadFacetType("relationship_tag", 24),
    loadFacetType("narrative_style", 16),
    loadFacetType("setting_tag", 30),
    loadFacetType("reader_experience", 20),
    loadFacetType("presentation_mode", 12),
    loadFacetType("content_type", 10),
    loadFacetType("age_rating", 10),
    loadFacetType("monetization_access", 8),
    loadFacetType("content_warning", 16),
    loadFacetType("story_status", 8)
  ]);

  return {
    genres,
    featuredGenreSlugs:
      featuredGenreSlugs.length > 0
        ? featuredGenreSlugs
        : genres.slice(0, 8).map((g) => g.slug),
    subgenres,
    tags,
    characters,
    relationships,
    narrativeStyles,
    settings,
    experiences,
    presentations,
    contentTypes,
    ageRatings,
    monetizationAccess,
    contentWarnings,
    storyStatuses
  };
}
