import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import { renderMarkdownContent } from "@/lib/platform-content/render-markdown-content";
import type { PolicyPage } from "@/types/policy-pages";

type SitePageContentViewProps = {
  page: PolicyPage;
  kicker?: string;
  breadcrumb?: { label: string; href: string } | null;
  relatedLinks?: Array<{ label: string; href: string }>;
};

export function SitePageContentView({
  page,
  kicker = "ChapMee",
  breadcrumb = null,
  relatedLinks = []
}: SitePageContentViewProps) {
  return (
    <ResponsivePageContainer className="py-8">
      <article className="mx-auto max-w-3xl space-y-6">
        {breadcrumb ? (
          <nav className="text-sm text-zinc-500">
            <Link className="hover:text-zinc-300" href={breadcrumb.href}>
              {breadcrumb.label}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-300">{page.title}</span>
          </nav>
        ) : null}

        <header className="space-y-3">
          {kicker ? <p className="page-kicker">{kicker}</p> : null}
          <PageHeading className="page-title">{page.title}</PageHeading>
          {page.summary ? <p className="page-copy">{page.summary}</p> : null}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>Phiên bản v{page.version}</span>
            {page.updated_at ? (
              <span>Cập nhật {new Date(page.updated_at).toLocaleDateString("vi-VN")}</span>
            ) : null}
            {page.effective_date ? (
              <span>Hiệu lực {new Date(page.effective_date).toLocaleDateString("vi-VN")}</span>
            ) : null}
          </div>
        </header>

        <div className="prose prose-neutral max-w-none dark:prose-invert prose-p:text-zinc-300">
          {renderMarkdownContent(page.content)}
        </div>

        {relatedLinks.length > 0 ? (
          <nav aria-label="Liên kết liên quan" className="flex flex-wrap gap-3 text-sm">
            {relatedLinks.map((link) => (
              <Link className="text-cyan-300 hover:text-cyan-200" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </article>
    </ResponsivePageContainer>
  );
}
