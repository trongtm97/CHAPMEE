import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SitePageContentView } from "@/components/content/SitePageContentView";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { buildSeoMetadata } from "@/lib/platform-content";
import {
  LEGAL_PAGE_SLUGS,
  buildLegalPageMetadataTitle,
  getLegalPage
} from "@/lib/legal-pages";
import { getPlatformPageContentMeta } from "@/lib/site-pages/platform-page-fallback";
import { resolveSitePage } from "@/lib/site-pages/resolve-site-page";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export async function generateStaticParams() {
  return LEGAL_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);
  const publicPath = `/legal/${slug}`;
  const resolved = await resolveSitePage(publicPath);
  const fallbackMeta = getPlatformPageContentMeta(publicPath);

  if (!page) {
    return {
      title: "Trang pháp lý | ChapMee",
      robots: { index: false, follow: false }
    };
  }

  if (resolved.page) {
    const cms = resolved.page;
    return buildSeoMetadata({
      pathname: publicPath,
      pageType: "page",
      title: cms.seo_title?.trim() || buildLegalPageMetadataTitle(page),
      description: cms.seo_description?.trim() || cms.summary || page.description,
      canonicalUrl: buildCanonicalUrl(publicPath) || undefined,
      indexableOverride: cms.seo_indexable
    });
  }

  return buildSeoMetadata({
    pathname: publicPath,
    pageType: "page",
    title: fallbackMeta?.title
      ? `${fallbackMeta.title} | ChapMee`
      : buildLegalPageMetadataTitle(page),
    description: fallbackMeta?.summary ?? page.description,
    canonicalUrl: buildCanonicalUrl(publicPath) || undefined,
    indexableOverride: true
  });
}

export default async function LegalPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getLegalPage(slug);

  if (!page) {
    notFound();
  }

  const publicPath = `/legal/${slug}`;
  const resolved = await resolveSitePage(publicPath);

  if (resolved.page) {
    return (
      <SitePageContentView
        breadcrumb={{ label: "Chính sách & pháp lý", href: "/legal" }}
        kicker="Pháp lý ChapMee"
        page={resolved.page}
        relatedLinks={[
          { label: "Tất cả chính sách", href: "/legal" },
          { label: "Liên hệ", href: "/contact" }
        ]}
      />
    );
  }

  return <LegalPageShell page={page} />;
}
