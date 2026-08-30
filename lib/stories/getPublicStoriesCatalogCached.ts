import { revalidateTag, unstable_cache } from "next/cache";
import { enrichStoryCatalogStories } from "@/lib/stories/enrich-story-catalog-stories";
import { getStoryCatalogPage, getStoryCatalogPageCore } from "@/lib/stories/get-story-catalog-page";
import { mapStoryCatalogPageToResult } from "@/lib/stories/map-catalog-page-result";
import type { StoryCatalogParams } from "@/lib/stories/get-public-stories";
import type { StoryCatalogResult } from "@/lib/stories/get-public-stories";

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
    params.hasAudio ?? "",
    params.hasVideo ?? "",
    params.contentOrigin ?? "",
    params.sort ?? "updated",
    params.status ?? "all",
    String(params.page ?? 1),
    String(params.pageSize ?? 24)
  ].join(":");
}

function catalogUsesDynamicRequestSources(params: StoryCatalogParams) {
  return Boolean(params.q?.trim());
}

export async function getPublicStoriesCatalogCached(
  params: StoryCatalogParams = {}
): Promise<StoryCatalogResult> {
  if (catalogUsesDynamicRequestSources(params)) {
    const page = await getStoryCatalogPage(params);
    return mapStoryCatalogPageToResult(page);
  }

  const key = catalogCacheKey(params);
  const cached = await unstable_cache(
    async () => mapStoryCatalogPageToResult(await getStoryCatalogPageCore(params)),
    ["story-catalog", key],
    { revalidate: 60, tags: ["story-catalog"] }
  )();

  const stories = await enrichStoryCatalogStories(cached.stories);
  return { ...cached, stories };
}

export function invalidateStoryCatalogCache() {
  revalidateTag("story-catalog", "max");
}
