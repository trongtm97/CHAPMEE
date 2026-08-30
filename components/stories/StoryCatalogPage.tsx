import { DesktopStoryCatalogLayout } from "@/components/stories/DesktopStoryCatalogLayout";
import { MobileStoryCatalogLayout } from "@/components/stories/MobileStoryCatalogLayout";
import { TaxonomyFilterApplyTracker } from "@/components/analytics/TaxonomyFilterApplyTracker";
import type { CatalogFilterOptions, StoryCatalogFilterParams } from "@/lib/discovery/types";
import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";

type StoryCatalogPageProps = {
  stories: StoryCatalogStory[];
  genres: StoryCatalogGenre[];
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  filters: StoryCatalogFilterParams;
  filterOptions: CatalogFilterOptions;
  hideCatalogHeader?: boolean;
  title?: string;
  subtitle?: string;
  hideMonetizationFilters?: boolean;
  hideAccessFilters?: boolean;
  allowedSorts?: StoryCatalogSort[];
  audioBadgeDisplay?: StoryAudioBadgeDisplay;
};

export function StoryCatalogPage(props: StoryCatalogPageProps) {
  return (
    <>
      <TaxonomyFilterApplyTracker filters={props.filters} sourcePage="truyen" />
      <MobileStoryCatalogLayout {...props} />
      <DesktopStoryCatalogLayout {...props} />
    </>
  );
}
