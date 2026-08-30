import Link from "next/link";
import type { Metadata } from "next";
import { SitePageContentView } from "@/components/content/SitePageContentView";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import { buildSeoMetadata } from "@/lib/platform-content";
import { getPlatformPageContentMeta } from "@/lib/site-pages/platform-page-fallback";
import { resolveSitePage } from "@/lib/site-pages/resolve-site-page";
import { DEFAULT_SITE_DESCRIPTION, SITE_NAME, buildCanonicalUrl } from "@/lib/seo/metadata";

const PUBLIC_PATH = "/about";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveSitePage(PUBLIC_PATH);
  const fallbackMeta = getPlatformPageContentMeta(PUBLIC_PATH);

  if (resolved.page) {
    const page = resolved.page;
    return buildSeoMetadata({
      pathname: PUBLIC_PATH,
      pageType: "page",
      title: page.seo_title?.trim() || `Giới thiệu ${SITE_NAME}`,
      description:
        page.seo_description?.trim() || page.summary || fallbackMeta?.summary || DEFAULT_SITE_DESCRIPTION,
      canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
      indexableOverride: page.seo_indexable
    });
  }

  return buildSeoMetadata({
    pathname: PUBLIC_PATH,
    pageType: "page",
    title: `Giới thiệu ${SITE_NAME}`,
    description: DEFAULT_SITE_DESCRIPTION,
    canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
    indexableOverride: true
  });
}

export default async function AboutPage() {
  const resolved = await resolveSitePage(PUBLIC_PATH);

  if (resolved.page) {
    return (
      <SitePageContentView
        kicker="Về ChapMee"
        page={resolved.page}
        relatedLinks={[
          { label: "Khám phá truyện", href: "/discover" },
          { label: "Chính sách & pháp lý", href: "/legal" },
          { label: "Liên hệ", href: "/contact" }
        ]}
      />
    );
  }

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <p className="page-kicker">Về ChapMee</p>
          <PageHeading className="page-title">Giới thiệu ChapMee</PageHeading>
          <p className="page-copy">{DEFAULT_SITE_DESCRIPTION}</p>
        </header>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/discover">
            Khám phá truyện
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/legal">
            Chính sách & pháp lý
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/contact">
            Liên hệ
          </Link>
        </div>
      </div>
    </ResponsivePageContainer>
  );
}
