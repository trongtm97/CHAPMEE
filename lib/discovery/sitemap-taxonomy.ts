import { TAXONOMY_INDEX_PATHNAMES } from "@/lib/discovery/taxonomy-index-config";
import {
  isTaxonomySeoIndexable,
  mapTaxonomySitemapChangefreq,
  mapTaxonomySitemapPriority,
  resolveTaxonomyCanonicalPath,
  TAXONOMY_SITEMAP_EXCLUDED_TYPES,
  type TaxonomySitemapEntry
} from "@/lib/seo/taxonomy-seo";
import { createClient } from "@/lib/supabase/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import {
  getLatestStoryUpdatedAtByTermIds,
  getPublishedStoryCountsByTermIds,
  maxIsoTimestamp
} from "@/lib/taxonomy/published-story-metrics";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

const SITEMAP_TYPES: TaxonomyType[] = [
  "main_genre",
  "subgenre",
  "trope_tag",
  "setting_tag",
  "reader_experience",
  "presentation_mode",
  "character_tag",
  "relationship_tag",
  "narrative_style",
  "content_type",
  "age_rating",
  "story_status",
  "monetization_access"
];

export type TaxonomySitemapPath = TaxonomySitemapEntry;

function isUuidSlug(slug: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slug
  );
}

export async function getTaxonomySitemapPaths(): Promise<TaxonomySitemapPath[]> {
  const supabase = await createClient();
  const eligibleTypes = SITEMAP_TYPES.filter(
    (type) => !TAXONOMY_SITEMAP_EXCLUDED_TYPES.includes(type)
  );

  const { data: rows } = await supabase
    .from("taxonomy_terms")
    .select("*")
    .in("type", eligibleTypes)
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_seo", true)
    .eq("seo_indexable", true)
    .gt("usage_count", 0)
    .order("sort_order", { ascending: true })
    .limit(2500);

  const terms = (rows ?? [])
    .map((row) => mapTaxonomyTermRow(row as Record<string, unknown>) as TaxonomyTerm)
    .filter((term) => !isUuidSlug(term.slug));

  const termIds = terms.map((term) => term.id);
  const [publishedCounts, latestStoryUpdated] = await Promise.all([
    getPublishedStoryCountsByTermIds(termIds),
    getLatestStoryUpdatedAtByTermIds(termIds)
  ]);

  const paths: TaxonomySitemapPath[] = [];

  for (const term of terms) {
    const publishedCount = publishedCounts.get(term.id) ?? term.usage_count;
    if (!isTaxonomySeoIndexable(term, publishedCount)) continue;

    const pathname = resolveTaxonomyCanonicalPath(term);
    if (!pathname || pathname.includes("?")) continue;

    const lastModified = maxIsoTimestamp(
      term.updated_at,
      latestStoryUpdated.get(term.id)
    );

    paths.push({
      pathname,
      lastModified: lastModified ?? undefined,
      priority: mapTaxonomySitemapPriority(term.sitemap_priority),
      changeFrequency: mapTaxonomySitemapChangefreq(term.sitemap_changefreq)
    });
  }

  paths.push({
    pathname: "/the-loai",
    priority: 0.7,
    changeFrequency: "weekly"
  });
  paths.push({
    pathname: "/kham-pha",
    priority: 0.7,
    changeFrequency: "weekly"
  });

  for (const pathname of TAXONOMY_INDEX_PATHNAMES) {
    paths.push({
      pathname,
      priority: 0.55,
      changeFrequency: "weekly"
    });
  }

  return paths;
}
