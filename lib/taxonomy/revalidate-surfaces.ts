import { revalidatePath } from "next/cache";
import type { TaxonomyType } from "@/types/taxonomy";

/** Invalidate taxonomy-related caches after catalog mutations. */
export async function revalidateTaxonomyCatalogSurfaces(type?: TaxonomyType) {
  const { invalidateTaxonomyCache } = await import("@/lib/taxonomy/cache");
  const { invalidateDiscoverHomeCache } = await import(
    "@/lib/discover/getDiscoverHomeData"
  );
  const { invalidateStoryCatalogCache } = await import(
    "@/lib/stories/getPublicStoriesCatalogCached"
  );
  const { invalidateCatalogFilterOptionsCache } = await import(
    "@/lib/discovery/catalog-filter-options-cached"
  );
  invalidateTaxonomyCache(type);
  invalidateDiscoverHomeCache();
  invalidateStoryCatalogCache();
  invalidateCatalogFilterOptionsCache();
  revalidatePath("/admin/taxonomy");
  revalidatePath("/admin/taxonomy/import-export");
  revalidatePath("/truyen");
  revalidatePath("/discover");
}
