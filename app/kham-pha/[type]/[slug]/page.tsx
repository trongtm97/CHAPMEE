import type { Metadata } from "next";
import {
  buildTaxonomyLandingMetadata,
  loadTaxonomyLandingRoute,
  TaxonomyLandingRouteView
} from "@/lib/discovery/taxonomy-landing-route";
import { assertTaxonomyLandingVisible } from "@/lib/discovery/taxonomy-landing";
import { resolveTaxonomyTypeFromUrlSegment } from "@/lib/taxonomy/public-url";
import { TAXONOMY_TYPES } from "@/types/taxonomy";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ type: string; slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { type: typeParam, slug } = await params;
  const type = resolveTaxonomyTypeFromUrlSegment(typeParam);
  if (!type || !TAXONOMY_TYPES.includes(type)) {
    return { title: "Không tìm thấy", robots: { index: false, follow: false } };
  }
  return buildTaxonomyLandingMetadata(typeParam, slug, {
    notFoundTitle: "Không tìm thấy",
    searchParams: await searchParams
  });
}

export default async function TaxonomyExplorePage({ params, searchParams }: PageProps) {
  const { type: typeParam, slug } = await params;
  const type = resolveTaxonomyTypeFromUrlSegment(typeParam);
  if (!type || !TAXONOMY_TYPES.includes(type)) {
    assertTaxonomyLandingVisible(null);
  }
  const route = await loadTaxonomyLandingRoute(typeParam, slug, await searchParams);
  return <TaxonomyLandingRouteView {...route} />;
}
