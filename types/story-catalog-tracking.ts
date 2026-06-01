import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";

export type StoryCatalogTrackingContext = {
  sourceSurface: TaxonomySourceSurface;
  termId: string;
  termType: string;
  termSlug: string;
  mainGenreId?: string | null;
};
