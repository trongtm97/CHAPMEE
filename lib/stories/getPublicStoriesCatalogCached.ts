import { unstable_cache } from "next/cache";
import {
  getPublicStoriesCatalog,
  type StoryCatalogParams
} from "@/lib/stories/get-public-stories";

function catalogCacheKey(params: StoryCatalogParams) {
  return [
    "story-catalog",
    params.q ?? "",
    params.genre ?? "",
    params.sort ?? "updated",
    params.status ?? "all",
    String(params.page ?? 1),
    String(params.pageSize ?? 20)
  ].join(":");
}

export function getPublicStoriesCatalogCached(params: StoryCatalogParams = {}) {
  const key = catalogCacheKey(params);

  return unstable_cache(() => getPublicStoriesCatalog(params), [key], {
    revalidate: 60,
    tags: ["story-catalog"]
  })();
}
