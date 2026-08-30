import type { Metadata } from "next";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { generateChapterSEO } from "@/lib/seo/generate-chapter-seo";
import { generateStorySEO } from "@/lib/seo/generate-story-seo";
import { createNextMetadata } from "@/lib/seo/create-next-metadata";
import { resolveSeoMetadata } from "@/lib/seo/resolve-seo-metadata";
import { getChapterUrl, getContentPostUrl, getStoryUrl } from "@/lib/seo/canonical";
import type { SeoPageType, SeoTargetType } from "@/lib/seo/seo-constants";
import type { ResolveSeoMetadataInput, SeoEntityData } from "@/lib/seo/seo-types";
import {
  getTaxonomySeoDescription,
  getTaxonomySeoTitle,
  taxonomyLandingShouldNoindex
} from "@/lib/seo/taxonomy-seo";
import { shouldIndexEpisode, shouldIndexStory } from "@/lib/seo/should-index";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryCatalogFilterParams } from "@/lib/discovery/catalog-url";
import type { TaxonomyTerm } from "@/types/taxonomy";
import { resolveContentPostOgImageUrl } from "@/lib/platform-content/resolve-content-post-media";
import { resolveTaxonomyOgImageUrl } from "@/lib/taxonomy/resolve-taxonomy-media";

export async function metadataFromSeoEngine(
  input: ResolveSeoMetadataInput
): Promise<Metadata> {
  const resolved = await resolveSeoMetadata(input);
  return createNextMetadata(resolved);
}

export async function metadataForStaticRoute(input: {
  path: string;
  pageType: SeoPageType;
  targetType?: SeoTargetType;
  fallbackTitle: string;
  fallbackDescription: string;
  indexableOverride?: boolean | null;
  followOverride?: boolean | null;
  entityData?: SeoEntityData | null;
}): Promise<Metadata> {
  return metadataFromSeoEngine({
    path: input.path,
    pageType: input.pageType,
    targetType: input.targetType ?? "route",
    fallbackTitle: input.fallbackTitle,
    fallbackDescription: input.fallbackDescription,
    indexableOverride: input.indexableOverride,
    followOverride: input.followOverride,
    entityData: input.entityData ?? null,
    openGraphType: "website"
  });
}

type StoryMetadataInput = StoryDetail & {
  canonicalUrl?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[] | null;
  seoTitle?: string | null;
  status?: string | null;
  visibility?: string | null;
};

export async function metadataForStory(story: StoryMetadataInput): Promise<Metadata> {
  const storyPath =
    story.canonicalUrl?.trim() ||
    getStoryUrl({ slug: story.slug, public_code: story.publicCode }) ||
    `/truyen/${story.slug}`;

  const indexable = shouldIndexStory({
    status: story.status,
    visibility: story.visibility
  });

  if (!indexable) {
    return metadataFromSeoEngine({
      path: storyPath,
      pageType: "story_detail",
      targetType: "story",
      targetId: story.id,
      fallbackTitle: story.title,
      fallbackDescription: "Truyện này chưa được công khai.",
      indexableOverride: false,
      entityData: {
        storyTitle: story.title,
        contentStatus: story.status ?? "draft",
        canonicalPath: storyPath
      },
      openGraphType: "article"
    });
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

  return metadataFromSeoEngine({
    path: storyPath,
    pageType: "story_detail",
    targetType: "story",
    targetId: story.id,
    fallbackTitle: story.seoTitle?.trim() || generated.title,
    fallbackDescription: story.seoDescription?.trim() || generated.description,
    entityData: {
      storyTitle: story.title,
      shortDescription: story.shortDescription || story.hook,
      genre: story.genreName,
      canonicalPath: storyPath,
      coverUrl: story.coverUrl,
      keywords: story.seoKeywords?.length ? story.seoKeywords : generated.keywords
    },
    openGraphType: "article"
  });
}

export async function metadataForChapter(
  data: EpisodeReaderData & {
    seoDescription?: string | null;
    seoKeywords?: string[] | null;
    seoTitle?: string | null;
    storyStatus?: string | null;
    storyVisibility?: string | null;
    episodeStatus?: string | null;
  }
): Promise<Metadata> {
  const chapterPath = getChapterUrl(
    { slug: data.story.slug, public_code: data.story.publicCode },
    { slug: data.episode.slug, public_code: data.episode.publicCode }
  );

  const indexable = shouldIndexEpisode({
    episodeStatus: data.episodeStatus ?? data.episode.status ?? "published",
    storyStatus: data.storyStatus ?? data.story.status,
    storyVisibility: data.storyVisibility ?? data.story.visibility ?? "public"
  });

  if (!indexable) {
    return metadataFromSeoEngine({
      path: chapterPath,
      pageType: "chapter",
      targetType: "chapter",
      targetId: data.episode.id,
      fallbackTitle: data.episode.title,
      fallbackDescription: "Chương này chưa được công khai.",
      indexableOverride: false,
      entityData: {
        storyTitle: data.story.title,
        chapterTitle: data.episode.title,
        chapterNumber: data.episode.episodeNumber,
        contentStatus: data.episodeStatus ?? data.episode.status,
        canonicalPath: chapterPath
      },
      openGraphType: "article"
    });
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

  return metadataFromSeoEngine({
    path: chapterPath,
    pageType: "chapter",
    targetType: "chapter",
    targetId: data.episode.id,
    fallbackTitle: data.seoTitle?.trim() || generated.title,
    fallbackDescription: data.seoDescription?.trim() || generated.description,
    entityData: {
      storyTitle: data.story.title,
      chapterTitle: data.episode.title,
      chapterNumber: data.episode.episodeNumber,
      authorName: data.story.creatorName,
      canonicalPath: chapterPath,
      coverUrl: data.story.coverUrl,
      keywords: data.seoKeywords?.length ? data.seoKeywords : generated.keywords
    },
    openGraphType: "article"
  });
}

export async function metadataForProfile(input: {
  path: string;
  displayName: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
}): Promise<Metadata> {
  const title = `${input.displayName} (@${input.username}) | ChapMee`;
  const description =
    input.bio?.trim() ||
    `Hồ sơ công khai của ${input.displayName} trên ChapMee.`;

  return metadataFromSeoEngine({
    path: input.path,
    pageType: "profile",
    targetType: "profile",
    fallbackTitle: title,
    fallbackDescription: description,
    entityData: {
      authorName: input.displayName,
      username: input.username,
      canonicalPath: input.path,
      avatarUrl: input.avatarUrl ?? null
    },
    openGraphType: "profile"
  });
}

export async function metadataForTaxonomyLanding(input: {
  term: TaxonomyTerm;
  canonicalPath: string;
  filters: StoryCatalogFilterParams;
  publishedStoryCount: number;
}): Promise<Metadata> {
  const noindex = taxonomyLandingShouldNoindex(
    input.term,
    input.filters,
    input.publishedStoryCount
  );
  const title = getTaxonomySeoTitle(input.term);
  const description = getTaxonomySeoDescription(input.term);

  const ogImage = await resolveTaxonomyOgImageUrl(input.term);

  return metadataFromSeoEngine({
    path: input.canonicalPath,
    pageType: "taxonomy",
    targetType: "taxonomy",
    targetId: input.term.id,
    fallbackTitle: title,
    fallbackDescription: description,
    indexableOverride: noindex ? false : null,
    followOverride: true,
    entityData: {
      taxonomyName: input.term.name,
      shortDescription: input.term.description,
      canonicalPath: input.canonicalPath,
      coverUrl: ogImage
    },
    openGraphType: "website"
  });
}

export type ContentPostMetadataInput = {
  id?: string;
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
  og_image_media_asset_id?: string | null;
  cover_image_url?: string | null;
  cover_media_asset_id?: string | null;
  robots?: string | null;
};

export async function metadataForContentPost(
  input: ContentPostMetadataInput
): Promise<Metadata> {
  const path = getContentPostUrl({ slug: input.slug, public_code: input.public_code });
  const coverUrl = await resolveContentPostOgImageUrl(input);

  return metadataFromSeoEngine({
    path,
    pageType: "article",
    targetType: "article",
    targetId: input.id ?? null,
    fallbackTitle: input.seo_title?.trim() || input.title,
    fallbackDescription:
      input.seo_description?.trim() || input.excerpt?.trim() || input.title,
    indexableOverride: input.indexable ? null : false,
    entityData: {
      postTitle: input.title,
      excerpt: input.excerpt,
      canonicalPath: path,
      coverUrl
    },
    openGraphType: "article"
  });
}

/** Re-export for backward compatibility — prefer direct imports from this module. */
export {
  metadataForStory as buildPublicStoryMetadataAsync,
  metadataForChapter as buildPublicEpisodeMetadataAsync,
  metadataForContentPost as buildPublicContentPostMetadataAsync
};
