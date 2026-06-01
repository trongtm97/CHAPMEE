import { getTaxonomyLandingPageData } from "@/lib/discovery/taxonomy-landing";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogResult } from "@/lib/stories/get-public-stories";
import type { TaxonomyType } from "@/types/taxonomy";

/** Paginated public stories for a taxonomy term (by type + slug). */
export async function getStoriesByTaxonomy(
  type: TaxonomyType,
  slug: string,
  params: StoryCatalogFilterParams = {}
): Promise<StoryCatalogResult | null> {
  const data = await getTaxonomyLandingPageData(type, slug, params);
  return data?.catalog ?? null;
}
