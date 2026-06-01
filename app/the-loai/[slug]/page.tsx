import type { Metadata } from "next";
import {
  buildTaxonomyLandingMetadata,
  TaxonomyLandingRouteView
} from "@/lib/discovery/taxonomy-landing-route";
import { assertTaxonomyLandingRoute } from "@/lib/discovery/taxonomy-landing";
import { getPublicGenreSlugs } from "@/lib/seo/static-params";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTaxonomyLandingMetadata("the-loai", slug, {
    notFoundTitle: "Không tìm thấy thể loại",
    searchParams: await searchParams
  });
}

export async function generateStaticParams() {
  const slugs = await getPublicGenreSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function TheLoaiLandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const route = await assertTaxonomyLandingRoute("the-loai", slug, await searchParams);
  return <TaxonomyLandingRouteView {...route} />;
}
