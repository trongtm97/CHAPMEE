import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import { ContentPostTypeBadge } from "@/components/admin/content-posts/ContentPostStatusBadge";
import { ContentPostArticleWithAds } from "@/components/ads/ContentPostArticleWithAds";
import { ShareButton } from "@/components/share/ShareButton";
import { buildPublicContentPostMetadata } from "@/lib/seo/build-metadata";
import { getContentPostByPublicCode, getContentPostBySlug } from "@/lib/platform-content";
import {
  isContentPostPubliclyVisible,
  listContentPosts
} from "@/lib/platform-content/content-posts";
import { estimateReadingMinutes } from "@/lib/content-posts/public-catalog";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getContentPostUrl } from "@/lib/seo/canonical";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveContentPost(segment: string) {
  const parsed = parsePublicSegment(segment, "content_post");
  if (parsed) {
    const { item } = await getContentPostByPublicCode(parsed.publicCode, {
      publicOnly: true
    });
    if (!item?.public_code) {
      return null;
    }
    return {
      item,
      canonicalPath: getContentPostUrl({
        slug: item.slug,
        public_code: item.public_code
      })
    };
  }

  const { item } = await getContentPostBySlug(segment, { publicOnly: true });
  if (!item?.public_code) {
    return null;
  }

  return {
    item,
    canonicalPath: getContentPostUrl({
      slug: item.slug,
      public_code: item.public_code
    })
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
  return buildPublicContentPostMetadata({
    title: item.title,
    slug: item.slug,
    public_code: String(item.public_code),
    seo_title: item.seo_title,
    seo_description: item.seo_description,
    excerpt: item.excerpt,
    content: item.content,
    canonical_url: item.canonical_url,
    indexable: item.indexable,
    follow: !item.robots.includes("nofollow"),
    og_image_url: item.og_image_url,
    cover_image_url: item.cover_image_url,
    robots: item.robots
  });
}

export default async function ContentPostPage({ params }: PageProps) {
  const { slug: segment } = await params;
  const currentPath = `/bai-viet/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const resolved = await resolveContentPost(segment);
  if (!resolved || !isContentPostPubliclyVisible(resolved.item)) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: resolved.canonicalPath
  });

  const { item, canonicalPath } = resolved;
  const readingMinutes = estimateReadingMinutes(item.content ?? "");
  const canonicalAbsolute = buildCanonicalUrl(canonicalPath) ?? canonicalPath;

  const { items: relatedItems } = await listContentPosts({
    publicOnly: true,
    postType: item.post_type,
    limit: 4
  });
  const related = relatedItems.filter((row) => row.id !== item.id).slice(0, 3);

  return (
    <ResponsivePageContainer className="max-w-3xl space-y-8 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link className="hover:text-foreground md:hidden" href="/discover">
          Khám phá
        </Link>
        <span className="mx-2 md:hidden">/</span>
        <Link className="hover:text-foreground" href="/bai-viet">
          Bài viết
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{item.title}</span>
      </nav>

      <article className="space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ContentPostTypeBadge type={item.post_type} />
            {item.category ? (
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.category}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold tracking-normal text-foreground md:text-4xl">
            {item.title}
          </h1>
          {item.excerpt ? (
            <p className="text-lg leading-8 text-muted-foreground">{item.excerpt}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span>ChapMee</span>
            {item.published_at ? (
              <time dateTime={item.published_at}>
                Đăng {new Date(item.published_at).toLocaleDateString("vi-VN")}
              </time>
            ) : null}
            {item.updated_at && item.updated_at !== item.published_at ? (
              <time dateTime={item.updated_at}>
                Cập nhật {new Date(item.updated_at).toLocaleDateString("vi-VN")}
              </time>
            ) : null}
            <span>{readingMinutes} phút đọc</span>
          </div>
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

        {item.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="w-full rounded-2xl border border-border"
            src={item.cover_image_url}
          />
        ) : null}

        <ContentPostArticleWithAds content={item.content ?? ""} />
      </article>

      {related.length > 0 ? (
        <section className="space-y-4 border-t border-border pt-8">
          <h2 className="text-lg font-bold text-foreground">Bài liên quan</h2>
          <ul className="space-y-3">
            {related.map((row) => (
              <li key={row.id}>
                <ContentPostCard compact item={row} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </ResponsivePageContainer>
  );
}
