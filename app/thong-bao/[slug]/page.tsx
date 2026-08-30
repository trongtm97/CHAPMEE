import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import {
  AnnouncementPriorityBadge,
  AnnouncementTypeBadge,
  getAnnouncementAccentClass
} from "@/components/admin/announcements/AnnouncementBadges";
import { buildPublicAnnouncementMetadata } from "@/lib/seo/build-metadata";
import { getAnnouncementByPublicCode, getAnnouncementBySlug } from "@/lib/platform-content";
import {
  escapePlainTextContent,
  splitPlainTextParagraphs
} from "@/lib/platform-content/render-content";
import { getAnnouncementUrl } from "@/lib/seo/canonical";
import { redirectToCanonicalIfNeeded, tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function resolveAnnouncement(segment: string) {
  const parsed = parsePublicSegment(segment, "announcement");
  if (parsed) {
    const { item } = await getAnnouncementByPublicCode(parsed.publicCode, {
      publicOnly: true
    });
    if (!item?.public_code) {
      return null;
    }
    return {
      item,
      canonicalPath: getAnnouncementUrl({
        slug: item.slug,
        public_code: item.public_code
      })
    };
  }

  const { item } = await getAnnouncementBySlug(segment, { publicOnly: true });
  if (!item?.public_code) {
    return null;
  }

  return {
    item,
    canonicalPath: getAnnouncementUrl({
      slug: item.slug,
      public_code: item.public_code
    })
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: segment } = await params;
  const resolved = await resolveAnnouncement(segment);

  if (!resolved) {
    const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
    return buildSeoMetadata({
      pathname: `/thong-bao/${segment}`,
      title: "Thông báo không tìm thấy",
      indexableOverride: false
    });
  }

  const { item } = resolved;

  return buildPublicAnnouncementMetadata({
    title: item.title,
    slug: item.slug,
    public_code: String(item.public_code),
    seo_title: item.seo_title,
    seo_description: item.seo_description,
    excerpt: item.excerpt,
    body: item.body,
    canonical_path: item.canonical_path,
    indexable: item.indexable,
    follow_links: item.follow_links,
    og_image_url: item.og_image_url,
    og_image_media_asset_id: item.og_image_media_asset_id
  });
}

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const { slug: segment } = await params;
  const currentPath = `/thong-bao/${segment}`;

  await tryRedirectFromLookupTable(currentPath);

  const resolved = await resolveAnnouncement(segment);
  if (!resolved) {
    notFound();
  }

  redirectToCanonicalIfNeeded({
    currentPath,
    canonicalPath: resolved.canonicalPath
  });

  const { item } = resolved;
  const paragraphs = splitPlainTextParagraphs(item.body ?? "");

  return (
    <ResponsivePageContainer className="py-8">
      <article
        className={`mx-auto max-w-3xl space-y-6 rounded-2xl ${getAnnouncementAccentClass(item)}`}
      >
        <Link className="text-sm text-muted-foreground transition hover:text-foreground" href="/thong-bao">
          ← Thông báo ChapMee
        </Link>

        <header className="space-y-3 px-1">
          <div className="flex flex-wrap gap-2">
            <AnnouncementTypeBadge type={item.announcement_type} />
            <AnnouncementPriorityBadge priority={item.priority} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{item.title}</h1>
        </header>

        <div className="prose prose-neutral max-w-none space-y-4 px-1 dark:prose-invert">
          {paragraphs.map((paragraph, index) => (
            <p key={`${item.id}-p-${index}`}>{escapePlainTextContent(paragraph)}</p>
          ))}
        </div>
      </article>
    </ResponsivePageContainer>
  );
}
