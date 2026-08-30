"use client";

import { CatalogSearchFilterShell } from "@/components/catalog/CatalogSearchFilterShell";
import { StoryCatalogAdvancedFilters } from "@/components/story-catalog/StoryCatalogAdvancedFilters";
import { storyCatalogFilterConfig } from "@/lib/catalog/story-catalog-filter-config";
import { buildStoryCatalogFilterRuntime } from "@/lib/catalog/story-catalog-runtime";
import type { CatalogFilterOptions } from "@/lib/discovery/types";
import type { StoryCatalogGenre, StoryCatalogSort } from "@/types/story";
import type { CatalogViewState } from "@/lib/stories/story-filters";

type StoryCatalogFilterCockpitProps = CatalogViewState & {
  filterOptions: CatalogFilterOptions;
  genres: StoryCatalogGenre[];
  hideAccessFilters?: boolean;
  hideMonetizationFilters?: boolean;
  allowedSorts?: StoryCatalogSort[];
};

export function StoryCatalogFilterCockpit({
  allowedSorts,
  filterOptions,
  filters,
  genre,
  genres,
  hideAccessFilters = false,
  hideMonetizationFilters = false,
  query,
  sort,
  status
}: StoryCatalogFilterCockpitProps) {
  const state: CatalogViewState = { filters, genre, query, sort, status };
  const runtime = buildStoryCatalogFilterRuntime(state, filterOptions);

  const sortOptions = allowedSorts?.length
    ? storyCatalogFilterConfig.sortOptions.filter((o) => allowedSorts.includes(o.id as StoryCatalogSort))
    : storyCatalogFilterConfig.sortOptions;

  return (
    <CatalogSearchFilterShell
      config={{ ...storyCatalogFilterConfig, sortOptions }}
      runtime={runtime}
      sortVariant="select"
      advancedSlot={
        <StoryCatalogAdvancedFilters
          filterOptions={filterOptions}
          filters={filters}
          genre={genre}
          genres={genres}
          hideAccessFilters={hideAccessFilters}
          hideMonetizationFilters={hideMonetizationFilters}
          query={query}
          sort={sort}
          status={status}
        />
      }
    />
  );
}
