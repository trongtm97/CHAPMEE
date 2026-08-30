import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import {
  resolveCreatorRowName,
  resolveCreatorRowUsername
} from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/data/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";
import { getEpisodePoll } from "@/lib/data/polls";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { getStoryPresentationSettings } from "@/lib/taxonomy/presentation";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { PollView } from "@/types/poll";
import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { getChapterImagesMap, type ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import { resolveReelsBackgroundUrl } from "@/lib/reels/resolve-reels-background";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import {
  EPISODE_BODY_SELECT,
  type EpisodeContentStorageRow
} from "@/lib/chapters/episode-content-row";
import { getChapterFullContent } from "@/lib/chapters/get-chapter-full-content";

export type EpisodeReaderData = {
  story: {
    id: string;
    title: string;
    slug: string;
    publicCode: string;
    creatorId: string | null;
    creatorUserId: string | null;
    creatorName: string | null;
    creatorUsername: string | null;
    authorVerification: PublicVerificationBadge | null;
    coverUrl: string | null;
    hook: string | null;
    genreName: string | null;
    ageRating: string;
    sensitiveFlags: string[];
    status: string;
    visibility: string;
  };
  episode: {
    id: string;
    episodeNumber: number;
    title: string;
    slug: string;
    publicCode: string;
    content: string;
    publishedAt: string | null;
    wordCount: number;
    backgroundImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string[];
    status: string;
    presentationMode: PresentationMode;
    chapterPresentationMode: string | null;
    storyPresentationMode: PresentationMode;
    structuredContent: unknown | null;
    contentFormat: ContentFormat | null;
    plainTextPreview: string | null;
    contentHash: string | null;
    contentUnavailableMessage: string | null;
    updatedAt: string | null;
  };
  previousEpisodeNumber: number | null;
  nextEpisodeNumber: number | null;
  previousChapterId: string | null;
  nextChapterId: string | null;
  previousChapterContentHash: string | null;
  nextChapterContentHash: string | null;
  previousChapterUpdatedAt: string | null;
  nextChapterUpdatedAt: string | null;
  storyHref: string;
  chapterHref: string;
  previousChapterHref: string | null;
  nextChapterHref: string | null;
  poll: PollView | null;
  chapterImageMap: ChapterImageMap;
};

export type GetEpisodeReaderDataOptions = {
  /** When false, S3-backed chapters return preview text only (use hydrate after access checks). */
  loadFullContent?: boolean;
};

export type EpisodeReaderResult = {
  data: EpisodeReaderData | null;
  episodeStorageRow: EpisodeContentStorageRow | null;
  notFound: boolean;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  cover_url: string | null;
  age_rating?: string | null;
  sensitive_flags?: string[] | null;
  status: string;
  visibility: string;
  creator_profiles:
    | { id: string | null; user_id: string | null; pen_name: string | null }
    | { id: string | null; user_id: string | null; pen_name: string | null }[]
    | null;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  slug: string;
  public_code: string;
  content: string | null;
  published_at: string | null;
  updated_at?: string | null;
  word_count: number | null;
  background_image_url: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  presentation_mode: string | null;
  structured_content: unknown | null;
  content_format: string | null;
  content_storage_type?: string | null;
  content_blob_format?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_size_bytes?: number | null;
  content_encoding?: string | null;
  plain_text_preview?: string | null;
  excerpt?: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getEpisodeReaderData(
  slug: string,
  episodeNumber: number,
  options?: GetEpisodeReaderDataOptions
): Promise<EpisodeReaderResult> {
  const loadFullContent = options?.loadFullContent === true;

  try {
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      return { data: null, episodeStorageRow: null, notFound: true, error: null };
    }

    const db = await createClient();
    const { data: storyRow, error: storyError } = await db
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, cover_url, age_rating, sensitive_flags, status, visibility, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", [...publicContentStatuses])
      .is("deleted_at", null)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!storyRow) {
      return { data: null, episodeStorageRow: null, notFound: true, error: null };
    }

    const story = storyRow as unknown as StoryRow;
    const { data: episodeRow, error: episodeError } = await db
      .from("episodes")
      .select(
        `id, episode_number, title, slug, public_code, published_at, word_count, background_image_url, status, seo_title, seo_description, seo_keywords, presentation_mode, ${EPISODE_BODY_SELECT}`
      )
      .eq("story_id", story.id)
      .eq("episode_number", episodeNumber)
      .in("status", [...publicContentStatuses])
      .is("deleted_at", null)
      .maybeSingle();

    if (episodeError) {
      throw episodeError;
    }

    if (!episodeRow) {
      return { data: null, episodeStorageRow: null, notFound: true, error: null };
    }

    const [previousEpisodeResult, nextEpisodeResult] = await Promise.all([
      db
        .from("episodes")
        .select("id, episode_number, slug, public_code, content_hash, updated_at")
        .eq("story_id", story.id)
        .in("status", [...publicContentStatuses])
        .is("deleted_at", null)
        .lt("episode_number", episodeNumber)
        .order("episode_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("episodes")
        .select("id, episode_number, slug, public_code, content_hash, updated_at")
        .eq("story_id", story.id)
        .in("status", [...publicContentStatuses])
        .is("deleted_at", null)
        .gt("episode_number", episodeNumber)
        .order("episode_number", { ascending: true })
        .limit(1)
        .maybeSingle()
    ]);
    if (previousEpisodeResult.error) {
      throw previousEpisodeResult.error;
    }
    if (nextEpisodeResult.error) {
      throw nextEpisodeResult.error;
    }

    const mapAdjacentEpisode = (
      row: typeof previousEpisodeResult.data | typeof nextEpisodeResult.data
    ) =>
      row
        ? {
            episodeNumber: Number(row.episode_number),
            id: String(row.id),
            slug: String(row.slug),
            publicCode: String(row.public_code),
            contentHash: row.content_hash ? String(row.content_hash) : null,
            updatedAt: row.updated_at ? String(row.updated_at) : null
          }
        : null;
    const creator = firstRelation(story.creator_profiles);
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, [story.id]);
    const genreName = taxonomyByStory.get(story.id)?.mainGenreName ?? null;
    const episode = episodeRow as EpisodeRow;
    const {
      data: { user }
    } = await db.auth.getUser();
    const [poll, presentationSettings] = await Promise.all([
      getEpisodePoll(episode.id, user?.id ?? null),
      getStoryPresentationSettings(story.id)
    ]);
    const storyPresentationMode = resolveEffectivePresentationMode({
      storyMode: presentationSettings.data?.mode ?? null
    });
    const chapterPresentationMode = episode.presentation_mode;
    const presentationMode = resolveEffectivePresentationMode({
      chapterMode: chapterPresentationMode,
      storyMode: presentationSettings.data?.mode ?? null
    });
    const authorVerification = creator?.user_id
      ? await getPublicVerificationBadge(creator.user_id)
      : null;
    const storyFields = { slug: story.slug, public_code: story.public_code };
    const storyHref = getStoryUrl(storyFields);
    const chapterHref = getChapterUrl(storyFields, {
      slug: episode.slug,
      public_code: episode.public_code
    });

    const episodeStorageRow: EpisodeContentStorageRow = {
      id: episode.id,
      story_id: story.id,
      content: episode.content,
      structured_content: episode.structured_content,
      content_format: episode.content_format,
      content_storage_type: episode.content_storage_type,
      content_blob_format: episode.content_blob_format,
      content_object_key: episode.content_object_key,
      content_hash: episode.content_hash,
      content_size_bytes: episode.content_size_bytes,
      content_encoding: episode.content_encoding,
      plain_text_preview: episode.plain_text_preview,
      excerpt: episode.excerpt,
      word_count: episode.word_count
    };

    const body = await getChapterFullContent(episodeStorageRow, {
      allowS3Fetch: loadFullContent
    });

    const structuredContent = body.unavailableMessage ? null : body.structuredContent;
    const chapterImageMap = loadFullContent
      ? await getChapterImagesMap(
          db,
          collectMediaIdsFromComposer(structuredContent)
        )
      : {};

    const previousEpisode = mapAdjacentEpisode(previousEpisodeResult.data);
    const nextEpisode = mapAdjacentEpisode(nextEpisodeResult.data);

    return {
      data: {
        story: {
          id: story.id,
          title: story.title,
          slug: story.slug,
          publicCode: story.public_code,
          creatorId: creator?.id ?? null,
          creatorUserId: creator?.user_id ?? null,
          creatorName: resolveCreatorRowName(creator),
          creatorUsername: resolveCreatorRowUsername(creator),
          authorVerification,
          coverUrl: resolveStoryCoverUrl(story.cover_url),
          hook: story.hook,
          genreName,
          ageRating: story.age_rating ?? "all_ages",
          sensitiveFlags: story.sensitive_flags ?? [],
          status: story.status,
          visibility: story.visibility
        },
        episode: {
          id: episode.id,
          episodeNumber: episode.episode_number,
          title: episode.title,
          slug: episode.slug,
          publicCode: episode.public_code,
          content: body.unavailableMessage ?? body.content,
          wordCount: Number(episode.word_count ?? 0),
          publishedAt: episode.published_at,
          backgroundImageUrl: resolveReelsBackgroundUrl(episode.background_image_url),
          seoTitle: episode.seo_title ?? null,
          seoDescription: episode.seo_description ?? null,
          seoKeywords: episode.seo_keywords ?? [],
          status: episode.status,
          presentationMode,
          chapterPresentationMode,
          storyPresentationMode,
          structuredContent,
          contentFormat:
            (episode.content_format as ContentFormat | null) ?? null,
          plainTextPreview: episode.plain_text_preview ?? null,
          contentHash: episode.content_hash ?? null,
          contentUnavailableMessage: body.unavailableMessage ?? null,
          updatedAt: episode.updated_at ?? null
        },
        chapterImageMap,
        previousEpisodeNumber: previousEpisode?.episodeNumber ?? null,
        nextEpisodeNumber: nextEpisode?.episodeNumber ?? null,
        previousChapterId: previousEpisode?.id ?? null,
        nextChapterId: nextEpisode?.id ?? null,
        previousChapterContentHash: previousEpisode?.contentHash ?? null,
        nextChapterContentHash: nextEpisode?.contentHash ?? null,
        previousChapterUpdatedAt: previousEpisode?.updatedAt ?? null,
        nextChapterUpdatedAt: nextEpisode?.updatedAt ?? null,
        storyHref,
        chapterHref,
        previousChapterHref: previousEpisode
          ? getChapterUrl(storyFields, {
              slug: previousEpisode.slug,
              public_code: previousEpisode.publicCode
            })
          : null,
        nextChapterHref: nextEpisode
          ? getChapterUrl(storyFields, {
              slug: nextEpisode.slug,
              public_code: nextEpisode.publicCode
            })
          : null,
        poll
      },
      episodeStorageRow,
      notFound: false,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      episodeStorageRow: null,
      notFound: false,
      error: error instanceof Error ? error.message : "Could not load episode."
    };
  }
}
