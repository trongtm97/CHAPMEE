import type { TaxonomyAnalyticsSurface } from "@/types/taxonomy-analytics";

type SurfaceMetadata = Record<string, unknown> | null | undefined;

export function resolveTaxonomySurface(
  trackingSurface: string,
  metadata?: SurfaceMetadata
): TaxonomyAnalyticsSurface {
  const sourceSurface =
    typeof metadata?.source_surface === "string"
      ? metadata.source_surface
      : typeof metadata?.sourceSurface === "string"
        ? metadata.sourceSurface
        : null;

  if (sourceSurface === "taxonomy_page") {
    return "taxonomy_page";
  }

  if (sourceSurface && isTaxonomySurface(sourceSurface)) {
    return sourceSurface;
  }

  if (trackingSurface === "category") {
    return "catalog";
  }

  if (isTaxonomySurface(trackingSurface)) {
    return trackingSurface;
  }

  return "other";
}

function isTaxonomySurface(value: string): value is TaxonomyAnalyticsSurface {
  return [
    "all",
    "reels",
    "discover",
    "search",
    "catalog",
    "taxonomy_page",
    "profile",
    "community",
    "ranking",
    "other"
  ].includes(value);
}
