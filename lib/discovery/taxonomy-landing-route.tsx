import type { Metadata } from "next";
import { TaxonomyLandingPage } from "@/components/taxonomy/TaxonomyLandingPage";
import { parseCatalogSearchParams } from "@/lib/discovery/catalog-url";
import {
  assertTaxonomyLandingRoute,
  getTaxonomyLandingPageData
} from "@/lib/discovery/taxonomy-landing";
import {
  buildTaxonomyLandingPageMetadata,
  buildTaxonomyNotFoundMetadata
} from "@/lib/seo/taxonomy-seo";

export async function loadTaxonomyLandingRoute(
  segment: string,
  slug: string,
  rawSearchParams: Record<string, string | undefined>
) {
  return assertTaxonomyLandingRoute(segment, slug, rawSearchParams);
}

export async function buildTaxonomyLandingMetadata(
  segment: string,
  slug: string,
  options: {
    notFoundTitle: string;
    searchParams?: Record<string, string | undefined>;
  }
): Promise<Metadata> {
  const filters = parseCatalogSearchParams(options.searchParams ?? {});
  const data = await getTaxonomyLandingPageData(segment, slug, {
    ...filters,
    page: filters.page ?? 1
  });

  if (!data) {
    return buildTaxonomyNotFoundMetadata(options.notFoundTitle);
  }

  const { term, canonicalPath, publishedStoryCount } = data.context;

  return buildTaxonomyLandingPageMetadata({
    term,
    canonicalPath,
    filters,
    publishedStoryCount
  });
}

export function TaxonomyLandingRouteView({
  filterOptions,
  landing
}: Awaited<ReturnType<typeof loadTaxonomyLandingRoute>>) {
  return (
    <TaxonomyLandingPage
      catalog={landing.catalog}
      context={landing.context}
      filterOptions={filterOptions}
      hideCatalogHeader
    />
  );
}
