import Link from "next/link";
import type { Metadata } from "next";
import { SitePageContentView } from "@/components/content/SitePageContentView";
import { LegalIndexContent } from "@/components/legal/LegalIndexContent";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import { buildSeoMetadata } from "@/lib/platform-content";
import { getPlatformPageContentMeta } from "@/lib/site-pages/platform-page-fallback";
import { resolveSitePage } from "@/lib/site-pages/resolve-site-page";
import { buildCanonicalUrl, SITE_NAME } from "@/lib/seo/metadata";

const PUBLIC_PATH = "/legal";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveSitePage(PUBLIC_PATH);
  const fallbackMeta = getPlatformPageContentMeta(PUBLIC_PATH);

  if (resolved.page) {
    const page = resolved.page;
    return buildSeoMetadata({
      pathname: PUBLIC_PATH,
      pageType: "page",
      title: page.seo_title?.trim() || `Chính sách & pháp lý | ${SITE_NAME}`,
      description:
        page.seo_description?.trim() ||
        page.summary ||
        fallbackMeta?.summary ||
        "Danh mục điều khoản, chính sách giao dịch và quy định dành cho tác giả trên ChapMee.",
      canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
      indexableOverride: page.seo_indexable
    });
  }

  return buildSeoMetadata({
    pathname: PUBLIC_PATH,
    pageType: "page",
    title: `Chính sách & pháp lý | ${SITE_NAME}`,
    description:
      "Danh mục điều khoản, chính sách giao dịch và quy định dành cho tác giả trên ChapMee.",
    canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
    indexableOverride: true
  });
}

export default async function LegalIndexPage() {
  const resolved = await resolveSitePage(PUBLIC_PATH);

  if (resolved.page) {
    return (
      <SitePageContentView
        kicker="Pháp lý ChapMee"
        page={resolved.page}
        relatedLinks={[
          { label: "Trang chủ", href: "/" },
          { label: "Liên hệ", href: "/contact" }
        ]}
      />
    );
  }

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <p className="page-kicker">Pháp lý ChapMee</p>
          <PageHeading className="page-title">Chính sách & pháp lý</PageHeading>
          <p className="page-copy">
            Tổng hợp đầy đủ chính sách pháp lý, giao dịch, Bộ Công Thương và quy định dành cho
            tác giả.
          </p>
        </header>

        <LegalIndexContent />

        <nav className="flex flex-wrap gap-3 text-sm">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/">
            Trang chủ
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/contact">
            Liên hệ
          </Link>
        </nav>
      </div>
    </ResponsivePageContainer>
  );
}
