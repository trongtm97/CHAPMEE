import type { Metadata } from "next";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import {
  getAnnouncementUrl,
  getPolicyUrl
} from "@/lib/seo/canonical";
import {
  buildCanonicalUrl,
  getDefaultOgImage,
  SITE_NAME
} from "@/lib/seo/metadata";
import {
  metadataForChapter,
  metadataForContentPost,
  metadataForStory,
  type ContentPostMetadataInput
} from "@/lib/seo/public-page-metadata";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

type StoryMetadataInput = StoryDetail & {
  canonicalUrl?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  seoTitle?: string | null;
  status?: string | null;
  visibility?: string | null;
};

/** @deprecated Prefer `metadataForStory` from `@/lib/seo/public-page-metadata`. */
export async function buildPublicStoryMetadata(
  story: StoryMetadataInput
): Promise<Metadata> {
  return metadataForStory(story);
}

/** @deprecated Prefer `metadataForChapter` from `@/lib/seo/public-page-metadata`. */
export async function buildPublicEpisodeMetadata(
  data: EpisodeReaderData & {
    seoDescription?: string | null;
    seoKeywords?: string[] | null;
    seoTitle?: string | null;
    storyStatus?: string | null;
    storyVisibility?: string | null;
    episodeStatus?: string | null;
  }
): Promise<Metadata> {
  return metadataForChapter(data);
}

export type { ContentPostMetadataInput };

/** @deprecated Prefer `metadataForContentPost` from `@/lib/seo/public-page-metadata`. */
export async function buildPublicContentPostMetadata(
  input: ContentPostMetadataInput
): Promise<Metadata> {
  return metadataForContentPost(input);
}

export type PolicyMetadataInput = {
  title: string;
  slug: string;
  public_code: string;
  seo_title?: string | null;
  seo_description?: string | null;
  summary?: string | null;
  content?: string | null;
  canonical_path?: string | null;
  seo_indexable: boolean;
};

export async function buildPublicPolicyMetadata(
  input: PolicyMetadataInput
): Promise<Metadata> {
  const pathname = getPolicyUrl({
    slug: input.slug,
    public_code: input.public_code
  });
  const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
  const { createExcerpt } = await import("@/lib/text/createExcerpt");

  return buildSeoMetadata({
    pathname,
    pageType: "policy_page",
    title: input.seo_title?.trim() || input.title,
    description:
      input.seo_description?.trim() ||
      input.summary?.trim() ||
      createExcerpt(input.content ?? "", 20, 40),
    canonicalUrl: input.canonical_path?.trim() || buildCanonicalUrl(pathname) || undefined,
    indexableOverride: input.seo_indexable
  });
}

export type AnnouncementMetadataInput = {
  title: string;
  slug: string;
  public_code: string;
  seo_title?: string | null;
  seo_description?: string | null;
  excerpt?: string | null;
  body?: string | null;
  canonical_path?: string | null;
  indexable: boolean;
  follow_links?: boolean;
  og_image_url?: string | null;
  og_image_media_asset_id?: string | null;
};

export async function buildPublicAnnouncementMetadata(
  input: AnnouncementMetadataInput
): Promise<Metadata> {
  const pathname = getAnnouncementUrl({
    slug: input.slug,
    public_code: input.public_code
  });
  const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
  const { createExcerpt } = await import("@/lib/text/createExcerpt");
  const { resolveAnnouncementOgImageUrl } = await import(
    "@/lib/platform-content/resolve-announcement-media"
  );

  return buildSeoMetadata({
    pathname,
    pageType: "announcement",
    title: input.seo_title?.trim() || input.title,
    description:
      input.seo_description?.trim() ||
      createExcerpt(input.excerpt ?? input.body ?? "", 20, 40),
    canonicalUrl: input.canonical_path?.trim() || buildCanonicalUrl(pathname) || undefined,
    indexableOverride: input.indexable,
    followOverride: input.follow_links,
    ogImage: (await resolveAnnouncementOgImageUrl(input)) ?? undefined
  });
}

export function buildGenreMetadata(input: {
  name: string;
  slug: string;
}) {
  const title = `${input.name} - Truyện trên ChapMee`;
  const description = `Khám phá truyện ${input.name} trên ChapMee.`;
  const canonical = buildCanonicalUrl(`/the-loai/${input.slug}`);

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    openGraph: {
      description,
      images: [{ alt: input.name, url: getDefaultOgImage() }],
      siteName: SITE_NAME,
      title
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [getDefaultOgImage()],
      title
    }
  } satisfies Metadata;
}
