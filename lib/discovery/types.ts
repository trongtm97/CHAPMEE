import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";
import type { StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";

export type StoryCatalogAccessFilter =
  | "free"
  | "paid"
  | "free_chapters"
  | "full_access";

export type StoryCatalogFilterParams = {
  q?: string;
  genre?: string;
  subgenre?: string;
  tag?: string;
  character?: string;
  relationship?: string;
  narrativeStyle?: string;
  setting?: string;
  experience?: string;
  presentation?: string;
  contentType?: string;
  ageRating?: string;
  /** Slug taxonomy `monetization_access` (gói truy cập). */
  monetization?: string;
  /** Slug taxonomy `content_warning`. */
  contentWarning?: string;
  /** Slug taxonomy `story_status` (ngoài ongoing/completed map sang `status`). */
  storyStatus?: string;
  access?: StoryCatalogAccessFilter;
  hasWarning?: "yes" | "no";
  hasNewChapter?: "yes" | "no";
  sort?: StoryCatalogSort;
  status?: StoryCatalogStatus;
  page?: number;
  pageSize?: number;
};

export type CatalogFilterFacet = {
  slug: string;
  name: string;
  storyCount?: number;
};

export type CatalogFilterOptions = {
  genres: CatalogFilterFacet[];
  featuredGenreSlugs: string[];
  subgenres: CatalogFilterFacet[];
  tags: CatalogFilterFacet[];
  settings: CatalogFilterFacet[];
  experiences: CatalogFilterFacet[];
  presentations: CatalogFilterFacet[];
  contentTypes: CatalogFilterFacet[];
  ageRatings: CatalogFilterFacet[];
  characters: CatalogFilterFacet[];
  relationships: CatalogFilterFacet[];
  narrativeStyles: CatalogFilterFacet[];
  monetizationAccess: CatalogFilterFacet[];
  contentWarnings: CatalogFilterFacet[];
  storyStatuses: CatalogFilterFacet[];
};

export type DiscoverTaxonomyChipSection = {
  key: string;
  title: string;
  seeAllHref: string;
  terms: Array<{
    id: string;
    name: string;
    slug: string;
    href: string;
    description: string | null;
  }>;
};

export type DiscoverTaxonomyStorySection = {
  key: string;
  title: string;
  termSlug: string;
  termType: TaxonomyType;
  seeAllHref: string;
  stories: StoryCatalogStory[];
};

export type DiscoverTaxonomyPayload = {
  featuredGenres: DiscoverTaxonomyChipSection;
  readerExperiences: DiscoverTaxonomyChipSection;
  settingTags: DiscoverTaxonomyChipSection;
  presentationModes: DiscoverTaxonomyChipSection;
  storySections: DiscoverTaxonomyStorySection[];
};

export type TaxonomyLandingParentGenre = {
  name: string;
  slug: string;
  href: string;
};

export type TaxonomyLandingContext = {
  term: TaxonomyTerm;
  type: TaxonomyType;
  canonicalPath: string;
  indexable: boolean;
  publishedStoryCount: number;
  parentGenre?: TaxonomyLandingParentGenre | null;
};
