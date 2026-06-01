import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import {
  resolveCreatorRowName,
  resolveCreatorRowUsername
} from "@/lib/creator/resolve-creator-row-name";
import { createClient } from "@/lib/supabase/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";
import { getEpisodePoll } from "@/lib/supabase/polls";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { getStoryPresentationSettings } from "@/lib/taxonomy/presentation";
import { getChapterUrl, getStoryUrl } from "@/lib/urls/paths";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { PollView } from "@/types/poll";
import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { getChapterImagesMap, type ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import type { ContentFormat, PresentationMode } from "@/types/presentation";

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
  };
  previousEpisodeNumber: number | null;
  nextEpisodeNumber: number | null;
  storyHref: string;
  chapterHref: string;
  previousChapterHref: string | null;
  nextChapterHref: string | null;
  poll: PollView | null;
  chapterImageMap: ChapterImageMap;
};

export type EpisodeReaderResult = {
  data: EpisodeReaderData | null;
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
  word_count: number | null;
  background_image_url: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  presentation_mode: string | null;
  structured_content: unknown | null;
  content_format: string | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getEpisodeReaderData(
  slug: string,
  episodeNumber: number
): Promise<EpisodeReaderResult> {
  try {
    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      return { data: null, notFound: true, error: null };
    }

    const supabase = await createClient();
    const { data: storyRow, error: storyError } = await supabase
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, cover_url, age_rating, sensitive_flags, status, visibility, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", [...publicContentStatuses])
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!storyRow) {
      return { data: null, notFound: true, error: null };
    }

    const story = storyRow as unknown as StoryRow;
    const { data: episodeRow, error: episodeError } = await supabase
      .from("episodes")
      .select(
        "id, episode_number, title, slug, public_code, content, published_at, word_count, background_image_url, status, seo_title, seo_description, seo_keywords, presentation_mode, structured_content, content_format"
      )
      .eq("story_id", story.id)
      .eq("episode_number", episodeNumber)
      .in("status", [...publicContentStatuses])
      .maybeSingle();

    if (episodeError) {
      throw episodeError;
    }

    if (!episodeRow) {
      return { data: null, notFound: true, error: null };
    }

    const { data: episodeRows } = await supabase
      .from("episodes")
      .select("episode_number, slug, public_code")
      .eq("story_id", story.id)
      .in("status", [...publicContentStatuses])
      .order("episode_number", { ascending: true });

    const orderedEpisodes = (episodeRows ?? [])
      .map((row) => ({
        episodeNumber: Number(row.episode_number),
        slug: String(row.slug),
        publicCode: String(row.public_code)
      }))
      .filter((row) => Number.isInteger(row.episodeNumber));
    const episodeNumbers = orderedEpisodes.map((row) => row.episodeNumber);
    const currentIndex = episodeNumbers.indexOf(episodeNumber);
    const creator = firstRelation(story.creator_profiles);
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, [story.id]);
    const genreName = taxonomyByStory.get(story.id)?.mainGenreName ?? null;
    const episode = episodeRow as EpisodeRow;
    const {
      data: { user }
    } = await supabase.auth.getUser();
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
    const structuredContent = episode.structured_content ?? null;
    const chapterImageMap = await getChapterImagesMap(
      supabase,
      collectMediaIdsFromComposer(structuredContent)
    );

    const previousEpisode = currentIndex > 0 ? orderedEpisodes[currentIndex - 1] : null;
    const nextEpisode =
      currentIndex >= 0 && currentIndex < orderedEpisodes.length - 1
        ? orderedEpisodes[currentIndex + 1]
        : null;

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
          coverUrl: story.cover_url,
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
          content: episode.content ?? "",
          wordCount: Number(episode.word_count ?? 0),
          publishedAt: episode.published_at,
          backgroundImageUrl: episode.background_image_url,
          seoTitle: episode.seo_title ?? null,
          seoDescription: episode.seo_description ?? null,
          seoKeywords: episode.seo_keywords ?? [],
          status: episode.status,
          presentationMode,
          chapterPresentationMode,
          storyPresentationMode,
          structuredContent,
          contentFormat:
            (episode.content_format as ContentFormat | null) ?? null
        },
        chapterImageMap,
        previousEpisodeNumber: previousEpisode?.episodeNumber ?? null,
        nextEpisodeNumber: nextEpisode?.episodeNumber ?? null,
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
      notFound: false,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      notFound: false,
      error: error instanceof Error ? error.message : "Could not load episode."
    };
  }
}
