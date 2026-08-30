"use client";

import { StoryFilterSheet } from "@/components/stories/StoryFilterSheet";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

type StoryCatalogMobileFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  genres: StoryCatalogGenre[];
  filterOptions: CatalogFilterOptions;
  query: string;
  genre: string;
  status: StoryCatalogStatus;
  sort: StoryCatalogSort;
  filters: StoryCatalogFilterParams;
  hideMonetizationFilters?: boolean;
  hideAccessFilters?: boolean;
};

export function StoryCatalogMobileFilterSheet(props: StoryCatalogMobileFilterSheetProps) {
  return <StoryFilterSheet {...props} />;
}
