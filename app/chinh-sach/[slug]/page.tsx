import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { buildPublicPolicyMetadata } from "@/lib/seo/build-metadata";
import { renderMarkdownContent } from "@/lib/platform-content/render-markdown-content";
import {
  getPolicyPageByPublicCode,
  getPolicyPageBySlug,
  isPolicyPubliclyVisible
} from "@/lib/policies/policy-pages";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getPolicyUrl } from "@/lib/seo/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolvePolicy(segment: string) {
  const parsed = parsePublicSegment(segment, "policy");
  if (parsed) {
    const { item } = await getPolicyPageByPublicCode(parsed.publicCode, { publicOnly: true });
    if (!item?.public_code) return null;
    return {
      item,
      canonicalPath: getPolicyUrl({ slug: item.slug, public_code: item.public_code })
    };
  }

  const { item } = await getPolicyPageBySlug(segment, { publicOnly: true });
  if (!item?.public_code) return null;

  return {
    item,
    canonicalPath: getPolicyUrl({ slug: item.slug, public_code: item.public_code })
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: segment } = await params;
  const resolved = await resolvePolicy(segment);

  if (!resolved) {
    const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
    return buildSeoMetadata({
      pathname: `/chinh-sach/${segment}`,
      title: "Chính sách không tìm thấy",
      indexableOverride: false
    });
  }

  const { item } = resolved;

  return buildPublicPolicyMetadata({
    title: item.title,
    slug: item.slug,
    public_code: String(item.public_code),
    seo_title: item.seo_title,
    seo_description: item.seo_description,
    summary: item.summary,
    content: item.content,
    canonical_path: item.canonical_path,
    seo_indexable: item.seo_indexable
  });
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { slug: segment } = await params;
  const currentPath = `/chinh-sach/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const resolved = await resolvePolicy(segment);
  if (!resolved || !isPolicyPubliclyVisible(resolved.item)) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: resolved.canonicalPath
  });

  const { item } = resolved;

  return (
    <ResponsivePageContainer className="max-w-3xl space-y-8 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link className="hover:text-foreground" href="/chinh-sach">
          Chính sách
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{item.title}</span>
      </nav>

      <article className="space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-normal text-foreground md:text-4xl">
            {item.title}
          </h1>
          {item.summary ? (
            <p className="text-lg leading-8 text-muted-foreground">{item.summary}</p>
          ) : null}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>Phiên bản v{item.version}</span>
            {item.effective_date ? (
              <span>
                Hiệu lực {new Date(item.effective_date).toLocaleDateString("vi-VN")}
              </span>
            ) : null}
            {item.updated_at ? (
              <span>Cập nhật {new Date(item.updated_at).toLocaleDateString("vi-VN")}</span>
            ) : null}
          </div>
        </header>

        <div className="prose prose-neutral max-w-none dark:prose-invert">
          {renderMarkdownContent(item.content)}
        </div>
      </article>
    </ResponsivePageContainer>
  );
}
