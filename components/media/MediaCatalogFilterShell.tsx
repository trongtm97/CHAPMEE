"use client";

import { useTransition } from "react";
import { CatalogSearchFilterShell } from "@/components/catalog/CatalogSearchFilterShell";
import { MediaAdvancedFilters } from "@/components/media/MediaAdvancedFilters";
import { getMediaCatalogFilterConfig } from "@/lib/catalog/media-catalog-filter-config";
import { buildMediaCatalogFilterRuntime } from "@/lib/catalog/media-catalog-runtime";
import type { CatalogFilterOptions } from "@/lib/discovery/types";
import type { MediaHubParams } from "@/lib/media/media-query-params";

type MediaCatalogFilterShellProps = {
  params: MediaHubParams;
  filterOptions: CatalogFilterOptions;
};

export function MediaCatalogFilterShell({ params, filterOptions }: MediaCatalogFilterShellProps) {
  const [pending] = useTransition();
  const config = getMediaCatalogFilterConfig(params.tab);
  const runtime = buildMediaCatalogFilterRuntime(params, filterOptions);

  return (
    <CatalogSearchFilterShell
      compact
      config={config}
      pending={pending}
      runtime={runtime}
      sortVariant="select"
      advancedSlot={<MediaAdvancedFilters filterOptions={filterOptions} params={params} />}
    />
  );
}
