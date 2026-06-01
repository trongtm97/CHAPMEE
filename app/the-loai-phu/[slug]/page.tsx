import type { Metadata } from "next";
import {
  buildTaxonomyLandingMetadata,
  TaxonomyLandingRouteView
} from "@/lib/discovery/taxonomy-landing-route";
import { assertTaxonomyLandingRoute } from "@/lib/discovery/taxonomy-landing";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTaxonomyLandingMetadata("the-loai-phu", slug, {
    notFoundTitle: "Không tìm thấy thể loại phụ",
    searchParams: await searchParams
  });
}

export default async function TheLoaiPhuLandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const route = await assertTaxonomyLandingRoute("the-loai-phu", slug, await searchParams);
  return <TaxonomyLandingRouteView {...route} />;
}
