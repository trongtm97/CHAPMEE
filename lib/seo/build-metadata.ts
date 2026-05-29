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
import { shouldIndexEpisode, shouldIndexStory } from "@/lib/seo/should-index";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";

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
      robots: { follow: false, index: false },
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
    buildCanonicalUrl(`/truyen/${story.slug}`);
  const coverUrl = resolvePublicUrl(story.coverUrl);
  const imageUrl = coverUrl ?? getDefaultOgImage();

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    keywords,
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
      robots: { follow: false, index: false },
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
    `/truyen/${data.story.slug}/chuong/${data.episode.episodeNumber}`
  );
  const imageUrl =
    resolvePublicUrl(data.story.coverUrl) ?? getDefaultOgImage();

  return {
    alternates: canonical ? { canonical } : undefined,
    description,
    keywords,
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
