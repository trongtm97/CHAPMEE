import type { Metadata } from "next";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { generateChapterSEO } from "@/lib/seo/generate-chapter-seo";
import { generateStorySEO } from "@/lib/seo/generate-story-seo";
import {
  buildCanonicalUrl,
  getDefaultOgImage,
  resolvePublicUrl,
  SITE_NAME
} from "@/lib/seo/metadata";
import { buildRobotsMeta } from "@/lib/seo/noindex";
import { shouldIndexEpisode, shouldIndexStory } from "@/lib/seo/should-index";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import {
  getAnnouncementUrl,
  getChapterUrl,
  getContentPostUrl,
  getPolicyUrl,
  getStoryUrl
} from "@/lib/seo/canonical";

type StoryMetadataInput = StoryDetail & {
  canonicalUrl?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  seoTitle?: string | null;
  status?: string | null;
  visibility?: string | null;
};

export function buildPublicStoryMetadata(story: StoryMetadataInput): Metadata {
  const indexable = shouldIndexStory({
    status: story.status,
    visibility: story.visibility
  });

  if (!indexable) {
    return {
      description: "Truyện này chưa được công khai.",
      robots: buildRobotsMeta({ indexable: false }),
      title: story.title
    };
  }

  const generated = generateStorySEO({
    genreName: story.genreName,
    hasCover: Boolean(story.coverUrl),
    hasGenre: Boolean(story.genreName),
    hasTags: story.tags.length > 0,
    hook: story.hook,
    isIndexable: true,
    longDescription: story.longDescription,
    shortDescription: story.shortDescription,
    title: story.title
  });

  const title = story.seoTitle?.trim() || generated.title;
  const description = story.seoDescription?.trim() || generated.description;
  const keywords =
    story.seoKeywords && story.seoKeywords.length > 0
      ? story.seoKeywords
      : generated.keywords;
  const canonical =
    story.canonicalUrl?.trim() ||
    buildCanonicalUrl(
      getStoryUrl({ slug: story.slug, public_code: story.publicCode })
    );
  const coverUrl = resolvePublicUrl(story.coverUrl);
  const imageUrl = coverUrl ?? getDefaultOgImage();

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    keywords,
    robots: buildRobotsMeta({ indexable: true }),
    openGraph: {
      description,
      images: [{ alt: story.title, url: imageUrl }],
      siteName: SITE_NAME,
      title,
      type: "article",
      ...(canonical ? { url: canonical } : {})
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title
    }
  };
}

export function buildPublicEpisodeMetadata(
  data: EpisodeReaderData & {
    seoDescription?: string | null;
    seoKeywords?: string[] | null;
    seoTitle?: string | null;
    storyStatus?: string | null;
    storyVisibility?: string | null;
    episodeStatus?: string | null;
  }
): Metadata {
  const indexable = shouldIndexEpisode({
    episodeStatus: data.episodeStatus ?? "published",
    storyStatus: data.storyStatus,
    storyVisibility: data.storyVisibility ?? "public"
  });

  if (!indexable) {
    return {
      description: "Chương này chưa được công khai.",
      robots: buildRobotsMeta({ indexable: false }),
      title: data.episode.title
    };
  }

  const generated = generateChapterSEO(
    {
      content: data.episode.content,
      storyTitle: data.story.title,
      title: data.episode.title
    },
    {
      authorName: data.story.creatorName,
      genreName: data.story.genreName,
      title: data.story.title
    }
  );

  const title = data.seoTitle?.trim() || generated.title;
  const description = data.seoDescription?.trim() || generated.description;
  const keywords = data.seoKeywords?.length
    ? data.seoKeywords
    : generated.keywords;
  const canonical = buildCanonicalUrl(
    getChapterUrl(
      {
        slug: data.story.slug,
        public_code: data.story.publicCode
      },
      {
        slug: data.episode.slug,
        public_code: data.episode.publicCode
      }
    )
  );
  const imageUrl =
    resolvePublicUrl(data.story.coverUrl) ?? getDefaultOgImage();

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    keywords,
    robots: buildRobotsMeta({ indexable: true }),
    openGraph: {
      description,
      images: [{ alt: title, url: imageUrl }],
      siteName: SITE_NAME,
      title,
      type: "article",
      ...(canonical ? { url: canonical } : {})
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title
    }
  };
}

export type ContentPostMetadataInput = {
  title: string;
  slug: string;
  public_code: string;
  seo_title?: string | null;
  seo_description?: string | null;
  excerpt?: string | null;
  content?: string | null;
  canonical_url?: string | null;
  indexable: boolean;
  follow?: boolean;
  og_image_url?: string | null;
  cover_image_url?: string | null;
  robots?: string | null;
};

export async function buildPublicContentPostMetadata(
  input: ContentPostMetadataInput
): Promise<Metadata> {
  const pathname = getContentPostUrl({
    slug: input.slug,
    public_code: input.public_code
  });
  const follow = input.follow ?? !input.robots?.includes("nofollow");

  const { buildSeoMetadata } = await import("@/lib/platform-content/seo-governance");
  const { createExcerpt } = await import("@/lib/text/createExcerpt");

  return buildSeoMetadata({
    pathname,
    pageType: "content_post",
    title: input.seo_title?.trim() || input.title,
    description:
      input.seo_description?.trim() ||
      createExcerpt(input.excerpt ?? input.content ?? "", 20, 40),
    canonicalUrl: input.canonical_url?.trim() || buildCanonicalUrl(pathname) || undefined,
    indexableOverride: input.indexable,
    followOverride: follow,
    ogImage: resolvePublicUrl(input.og_image_url ?? input.cover_image_url ?? null) ?? undefined
  });
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
    ogImage: resolvePublicUrl(input.og_image_url) ?? undefined
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
