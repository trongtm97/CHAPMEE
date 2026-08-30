import Link from "next/link";
import type { Metadata } from "next";
import { SitePageContentView } from "@/components/content/SitePageContentView";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import { buildSeoMetadata } from "@/lib/platform-content";
import { getPlatformPageContentMeta } from "@/lib/site-pages/platform-page-fallback";
import { resolveSitePage } from "@/lib/site-pages/resolve-site-page";
import { buildCanonicalUrl, SITE_NAME } from "@/lib/seo/metadata";
import { getContactSettings } from "@/lib/settings/get-contact-settings";

const PUBLIC_PATH = "/contact";

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await resolveSitePage(PUBLIC_PATH);
  const fallbackMeta = getPlatformPageContentMeta(PUBLIC_PATH);

  if (resolved.page) {
    const page = resolved.page;
    return buildSeoMetadata({
      pathname: PUBLIC_PATH,
      pageType: "page",
      title: page.seo_title?.trim() || `Liên hệ ${SITE_NAME}`,
      description:
        page.seo_description?.trim() ||
        page.summary ||
        fallbackMeta?.summary ||
        "Liên hệ ChapMee để báo lỗi, góp ý hoặc trao đổi hợp tác.",
      canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
      indexableOverride: page.seo_indexable
    });
  }

  return buildSeoMetadata({
    pathname: PUBLIC_PATH,
    pageType: "page",
    title: `Liên hệ ${SITE_NAME}`,
    description: "Liên hệ ChapMee để báo lỗi, góp ý hoặc trao đổi hợp tác.",
    canonicalUrl: buildCanonicalUrl(PUBLIC_PATH) || undefined,
    indexableOverride: true
  });
}

export default async function ContactPage() {
  const resolved = await resolveSitePage(PUBLIC_PATH);

  if (resolved.page) {
    return (
      <SitePageContentView
        kicker="Liên hệ"
        page={resolved.page}
        relatedLinks={[
          { label: "Nguyên tắc cộng đồng", href: "/legal/community-guidelines" },
          { label: "Chính sách & pháp lý", href: "/legal" },
          { label: "Giới thiệu", href: "/about" }
        ]}
      />
    );
  }

  const { settings } = await getContactSettings();
  const supportEmail = settings.enableSupportEmail ? settings.supportEmail.trim() : "";

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <p className="page-kicker">Liên hệ</p>
          <PageHeading className="page-title">Liên hệ ChapMee</PageHeading>
          <p className="page-copy">
            Gửi góp ý, báo lỗi, khiếu nại nội dung hoặc hỏi về hợp tác.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-bold text-white">Kênh hỗ trợ</h2>
          <ul className="space-y-2 text-sm leading-6 text-zinc-300">
            {supportEmail ? (
              <li>
                Email hỗ trợ:{" "}
                <a className="text-cyan-300 hover:text-cyan-200" href={`mailto:${supportEmail}`}>
                  {supportEmail}
                </a>
              </li>
            ) : null}
            {settings.enableFeedbackForm ? (
              <li>
                Bạn cũng có thể gửi phản hồi trực tiếp trong ứng dụng khi đã đăng nhập.
              </li>
            ) : null}
            {settings.enableTelegram && settings.telegramUrl ? (
              <li>
                Telegram:{" "}
                <a
                  className="text-cyan-300 hover:text-cyan-200"
                  href={settings.telegramUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {settings.telegramLabel || "Telegram"}
                </a>
              </li>
            ) : null}
            {settings.enableFacebook && settings.facebookUrl ? (
              <li>
                Facebook:{" "}
                <a
                  className="text-cyan-300 hover:text-cyan-200"
                  href={settings.facebookUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {settings.fanpageLabel || "Fanpage"}
                </a>
              </li>
            ) : null}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            className="text-cyan-300 hover:text-cyan-200"
            href="/legal/community-guidelines"
          >
            Nguyên tắc cộng đồng
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/legal">
            Chính sách & pháp lý
          </Link>
          <Link className="text-cyan-300 hover:text-cyan-200" href="/about">
            Giới thiệu
          </Link>
        </div>
      </div>
    </ResponsivePageContainer>
  );
}
