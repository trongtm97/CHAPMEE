import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { PageHeading } from "@/components/seo/PageHeading";
import {
  LEGAL_BCT_DISCLAIMER,
  LEGAL_CONTENT_PLACEHOLDER,
  formatLegalUpdatedDate,
  type LegalPageDefinition
} from "@/lib/legal-pages";

type LegalPageShellProps = {
  page: LegalPageDefinition;
  updatedAt?: string;
};

export function LegalPageShell({ page, updatedAt }: LegalPageShellProps) {
  const lastUpdated = updatedAt ?? formatLegalUpdatedDate();

  return (
    <ResponsivePageContainer className="py-8">
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <p className="page-kicker">Pháp lý ChapMee</p>
          <PageHeading className="page-title">{page.title}</PageHeading>
          <p className="text-xs text-zinc-500">Cập nhật lần cuối: {lastUpdated}</p>
        </header>

        <p className="text-sm leading-7 text-zinc-300">{LEGAL_CONTENT_PLACEHOLDER}</p>

        {page.slug === "business-info" ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Bộ Công Thương
            </h2>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{LEGAL_BCT_DISCLAIMER}</p>
          </section>
        ) : null}

        <nav aria-label="Liên kết liên quan" className="text-sm">
          <Link className="text-cyan-300 hover:text-cyan-200" href="/legal">
            ← Quay lại Chính sách & pháp lý
          </Link>
        </nav>
      </article>
    </ResponsivePageContainer>
  );
}
