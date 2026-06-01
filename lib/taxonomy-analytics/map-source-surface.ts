import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";
import type { TaxonomyAnalyticsSurface } from "@/types/taxonomy-analytics";
import type { TrackingSurface } from "@/types/tracking";

export function mapTrackingSurfaceToTaxonomySource(
  surface: TrackingSurface | string
): TaxonomySourceSurface {
  switch (surface) {
    case "reels":
      return "reels";
    case "discover":
      return "discover";
    case "search":
      return "search";
    case "category":
      return "catalog";
    case "profile":
      return "profile";
    case "community":
      return "community";
    default:
      return "catalog";
  }
}

export function mapFilterSourcePage(sourcePage: string): TaxonomyAnalyticsSurface {
  if (sourcePage === "taxonomy_page") {
    return "taxonomy_page";
  }
  if (sourcePage === "discover") {
    return "discover";
  }
  if (sourcePage === "search") {
    return "search";
  }
  if (sourcePage === "studio") {
    return "other";
  }
  return "catalog";
}
