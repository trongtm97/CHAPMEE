import { unstable_cache, revalidateTag } from "next/cache";
import { getStoryCatalogPage } from "@/lib/stories/get-story-catalog-page";
import { mapStoryCatalogPageToResult } from "@/lib/stories/map-catalog-page-result";
import type { StoryCatalogParams } from "@/lib/stories/get-public-stories";

function catalogCacheKey(params: StoryCatalogParams) {
  return [
    "story-catalog",
    params.q ?? "",
    params.genre ?? "",
    params.subgenre ?? "",
    params.tag ?? "",
    params.character ?? "",
    params.relationship ?? "",
    params.narrativeStyle ?? "",
    params.setting ?? "",
    params.experience ?? "",
    params.presentation ?? "",
    params.contentType ?? "",
    params.ageRating ?? "",
    params.access ?? "",
    params.hasWarning ?? "",
    params.hasNewChapter ?? "",
    params.sort ?? "updated",
    params.status ?? "all",
    String(params.page ?? 1),
    String(params.pageSize ?? 20)
  ].join(":");
}

export function getPublicStoriesCatalogCached(params: StoryCatalogParams = {}) {
  const key = catalogCacheKey(params);

  return unstable_cache(
    async () => {
      const page = await getStoryCatalogPage(params);
      return mapStoryCatalogPageToResult(page);
    },
    [key],
    {
      revalidate: 60,
      tags: ["story-catalog"]
    }
  )();
}

export function invalidateStoryCatalogCache() {
  revalidateTag("story-catalog", "max");
}
