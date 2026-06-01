import { unstable_cache, revalidateTag } from "next/cache";
import { getCatalogFilterOptions } from "@/lib/discovery/catalog-filter-options";

export function getCatalogFilterOptionsCached() {
  return unstable_cache(
    () => getCatalogFilterOptions(),
    ["catalog-filter-options"],
    {
      revalidate: 300,
      tags: ["catalog-filter-options", "taxonomy"]
    }
  )();
}

export function invalidateCatalogFilterOptionsCache() {
  revalidateTag("catalog-filter-options", "max");
}
