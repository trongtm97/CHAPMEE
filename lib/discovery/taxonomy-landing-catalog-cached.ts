import { unstable_cache } from "next/cache";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import { getStoryCatalogPage } from "@/lib/stories/get-story-catalog-page";
import { mapStoryCatalogPageToResult } from "@/lib/stories/map-catalog-page-result";
import type { TaxonomyType } from "@/types/taxonomy";

export function getTaxonomyLandingCatalogCached(
  type: TaxonomyType,
  slug: string,
  catalogParams: StoryCatalogFilterParams
) {
  const key = [
    "taxonomy-landing-catalog",
    type,
    slug,
    catalogParams.sort ?? "updated",
    catalogParams.status ?? "all",
    String(catalogParams.page ?? 1),
    String(catalogParams.pageSize ?? 20)
  ].join(":");

  return unstable_cache(
    async () => {
      const page = await getStoryCatalogPage(catalogParams);
      return mapStoryCatalogPageToResult(page);
    },
    [key],
    {
      revalidate: 60,
      tags: ["story-catalog", `taxonomy-landing:${type}:${slug}`]
    }
  )();
}
