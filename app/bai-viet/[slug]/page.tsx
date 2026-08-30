import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { ContentPostArticleWithAds } from "@/components/ads/ContentPostArticleWithAds";
import {
  ContentPostDetailCta,
  ContentPostDetailMeta,
  ContentPostRelatedSection
} from "@/components/content-posts/ContentPostDetailExtras";
import { ShareButton } from "@/components/share/ShareButton";
import { ContentPostViewTracker } from "@/components/content-posts/ContentPostViewTracker";
import { buildPublicContentPostMetadata } from "@/lib/seo/build-metadata";
import {
  getDevFallbackPostByPublicCode,
  getDevFallbackPostBySlug
} from "@/lib/content-posts/dev-fallback-posts";
import { estimateReadingMinutes } from "@/lib/content-posts/public-catalog";
import { getContentPostByPublicCode, getContentPostBySlug } from "@/lib/platform-content";
import {
  isContentPostPubliclyVisible,
  listContentPosts
} from "@/lib/platform-content/content-posts";
import { listCategoriesForPost } from "@/lib/platform-content/content-post-categories";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import {
  buildBreadcrumbJsonLd,
  buildContentPostArticleJsonLd
} from "@/lib/seo/structured-data";
import { getContentPostUrl } from "@/lib/urls/paths";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";
import type { AdminContentPost } from "@/types/platform-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveContentPost(segment: string): Promise<{
  item: AdminContentPost;
  canonicalPath: string;
  isDevFallback: boolean;
} | null> {
  const parsed = parsePublicSegment(segment, "content_post");
  if (parsed) {
    const { item } = await getContentPostByPublicCode(parsed.publicCode, {
      publicOnly: true
    });
    const devItem = !item ? getDevFallbackPostByPublicCode(parsed.publicCode) : null;
    if (devItem) {
      return {
        item: devItem,
        canonicalPath: `/bai-viet/${devItem.slug}`,
        isDevFallback: true
      };
    }
    if (!item?.public_code) {
      return null;
    }
    return {
      item,
      canonicalPath: getContentPostUrl({
        slug: item.slug,
        public_code: item.public_code
      }),
      isDevFallback: false
    };
  }

  const { item } = await getContentPostBySlug(segment, { publicOnly: true });
  const devItem = !item ? getDevFallbackPostBySlug(segment) : null;
  const resolved = item ?? devItem;
  if (!resolved) {
    return null;
  }
  if (devItem) {
    return {
      item: devItem,
      canonicalPath: `/bai-viet/${devItem.slug}`,
      isDevFallback: true
    };
  }
  if (!resolved.public_code) {
    return null;
  }

  return {
    item: resolved,
    canonicalPath: getContentPostUrl({
      slug: resolved.slug,
      public_code: resolved.public_code
    }),
    isDevFallback: false
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: segment } = await params;
  const resolved = await resolveContentPost(segment);

  if (!resolved) {
    const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
    return buildSeoMetadata({
      pathname: `/bai-viet/${segment}`,
      title: "Bài viết không tìm thấy",
      indexableOverride: false
    });
  }

  const { item } = resolved;
  return await buildPublicContentPostMetadata({
    title: item.title,
    slug: item.slug,
    public_code: String(item.public_code),
    id: item.id,
    seo_title: item.seo_title,
    seo_description: item.seo_description,
    excerpt: item.excerpt,
    content: item.content,
    canonical_url: item.canonical_url,
    indexable: item.indexable,
    follow: !item.robots.includes("nofollow"),
    og_image_url: item.og_image_url,
    og_image_media_asset_id: item.og_image_media_asset_id,
    cover_image_url: item.cover_image_url,
    cover_media_asset_id: item.cover_media_asset_id,
    robots: item.robots
  });
}

export default async function ContentPostPage({ params }: PageProps) {
  const { slug: segment } = await params;
  const currentPath = `/bai-viet/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const resolved = await resolveContentPost(segment);
  if (!resolved) {
    notFound();
  }

  if (!resolved.isDevFallback && !isContentPostPubliclyVisible(resolved.item)) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: resolved.canonicalPath
  });

  const { item, canonicalPath } = resolved;
  const readingMinutes = estimateReadingMinutes(item.content ?? "");
  const canonicalAbsolute = buildCanonicalUrl(canonicalPath) ?? canonicalPath;

  const [{ items: relatedItems }, categoryResult] = await Promise.all([
    listContentPosts({
      publicOnly: true,
      postType: item.post_type,
      limit: 4
    }),
    resolved.isDevFallback ? Promise.resolve({ items: [], error: null as string | null }) : listCategoriesForPost(item.id, { publicOnly: true })
  ]);
  let related = relatedItems.filter((row) => row.id !== item.id).slice(0, 3);
  const assignedCategories = categoryResult.items;

  if (related.length === 0 && resolved.isDevFallback) {
    const { DEV_FALLBACK_CONTENT_POSTS } = await import("@/lib/content-posts/dev-fallback-posts");
    related = DEV_FALLBACK_CONTENT_POSTS.filter(
      (row) => row.id !== item.id && row.post_type === item.post_type
    ).slice(0, 3);
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: buildCanonicalUrl("/") ?? "/" },
    { name: "Bài viết", url: buildCanonicalUrl("/bai-viet") ?? "/bai-viet" },
    { name: item.title, url: canonicalAbsolute }
  ]);
  const articleJsonLd = buildContentPostArticleJsonLd({
    title: item.title,
    description: item.excerpt ?? item.seo_description,
    url: canonicalAbsolute,
    datePublished: item.published_at,
    dateModified: item.updated_at,
    image: item.coverDisplayUrl ?? item.cover_image_url
  });

  return (
    <ResponsivePageContainer className="py-6 md:py-8">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        type="application/ld+json"
      />
      {resolved.isDevFallback ? null : <ContentPostViewTracker postId={item.id} />}
      <div className="mx-auto max-w-3xl space-y-8">
        <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
          <Link className="hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400" href="/">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          <Link
            className="hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            href="/bai-viet"
          >
            Bài viết
          </Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-300">{item.title}</span>
        </nav>

        <article className="space-y-6">
          <header className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">{item.title}</h1>
            {item.excerpt ? (
              <p className="text-lg leading-8 text-zinc-400">{item.excerpt}</p>
            ) : null}
            {assignedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedCategories.map((cat) => (
                  <Link
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-white/20 hover:text-white"
                    href={`/bai-viet/danh-muc/${cat.slug}`}
                    key={cat.id}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <ContentPostDetailMeta item={item} readingMinutes={readingMinutes} />
            <ShareButton
              label="Chia sẻ"
              payload={{
                kind: "generic",
                title: item.title,
                text: item.excerpt ?? createExcerpt(item.content ?? "", 20, 30),
                url: canonicalAbsolute
              }}
              variant="ghost"
            />
          </header>

          {item.coverDisplayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="w-full rounded-2xl border border-white/10"
              src={item.coverDisplayUrl}
            />
          ) : null}

          <div className="prose prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-lg prose-p:text-zinc-300">
            <ContentPostArticleWithAds content={item.content ?? ""} />
          </div>
        </article>

        <ContentPostDetailCta />
        <ContentPostRelatedSection related={related} />
      </div>
    </ResponsivePageContainer>
  );
}
