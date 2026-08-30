import { unstable_cache } from "next/cache";
import type { StoryCatalogFilterParams } from "@/lib/discovery/types";
import {
  getStoryCatalogPage,
  getStoryCatalogPageCore
} from "@/lib/stories/get-story-catalog-page";
import { enrichStoryCatalogStories } from "@/lib/stories/enrich-story-catalog-stories";
import { mapStoryCatalogPageToResult } from "@/lib/stories/map-catalog-page-result";
import type { TaxonomyType } from "@/types/taxonomy";

function catalogUsesDynamicRequestSources(catalogParams: StoryCatalogFilterParams) {
  return Boolean(catalogParams.q?.trim());
}

export async function getTaxonomyLandingCatalogCached(
  type: TaxonomyType,
  slug: string,
  catalogParams: StoryCatalogFilterParams
) {
  if (catalogUsesDynamicRequestSources(catalogParams)) {
    const page = await getStoryCatalogPage(catalogParams);
    return mapStoryCatalogPageToResult(page);
  }

  const key = [
    "taxonomy-landing-catalog",
    type,
    slug,
    catalogParams.sort ?? "updated",
    catalogParams.status ?? "all",
    String(catalogParams.page ?? 1),
    String(catalogParams.pageSize ?? 20)
  ].join(":");

  const cached = await unstable_cache(
    async () => mapStoryCatalogPageToResult(await getStoryCatalogPageCore(catalogParams)),
    [key],
    {
      revalidate: 60,
      tags: ["story-catalog", `taxonomy-landing:${type}:${slug}`]
    }
  )();

  const stories = await enrichStoryCatalogStories(cached.stories);
  return { ...cached, stories };
}
