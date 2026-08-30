import { MediaCatalogFilterShell } from "@/components/media/MediaCatalogFilterShell";
import type { MediaHubParams } from "@/lib/media/media-query-params";

type MediaCatalogFilterSectionProps = {
  params: MediaHubParams;
};

export async function MediaCatalogFilterSection({ params }: MediaCatalogFilterSectionProps) {
  const { loadCatalogFilterOptionsPublic } = await import(
    "@/lib/discovery/catalog-filter-options-public"
  );
  const filterOptions = await loadCatalogFilterOptionsPublic();
  return <MediaCatalogFilterShell filterOptions={filterOptions} params={params} />;
}
