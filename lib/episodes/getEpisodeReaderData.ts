import { createClient } from "@/lib/supabase/server";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type { PublicVerificationBadge } from "@/types/verification";
import { getEpisodePoll } from "@/lib/supabase/polls";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { PollView } from "@/types/poll";

export type EpisodeReaderData = {
  story: {
    id: string;
    title: string;
    slug: string;
    creatorId: string | null;
    creatorUserId: string | null;
    creatorName: string | null;
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
    content: string;
    publishedAt: string | null;
    wordCount: number;
    backgroundImageUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string[];
    status: string;
  };
  previousEpisodeNumber: number | null;
  nextEpisodeNumber: number | null;
  poll: PollView | null;
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
  hook: string | null;
  cover_url: string | null;
  age_rating?: string | null;
  sensitive_flags?: string[] | null;
  status: string;
  visibility: string;
  genres: { name: string | null } | { name: string | null }[] | null;
  creator_profiles:
    | { id: string | null; user_id: string | null; pen_name: string | null }
    | { id: string | null; user_id: string | null; pen_name: string | null }[]
    | null;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  content: string | null;
  published_at: string | null;
  word_count: number | null;
  background_image_url: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
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
        "id, title, slug, hook, cover_url, age_rating, sensitive_flags, status, visibility, genres(name), creator_profiles(id, user_id, pen_name)"
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
        "id, episode_number, title, content, published_at, word_count, background_image_url, status, seo_title, seo_description, seo_keywords"
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
      .select("episode_number")
      .eq("story_id", story.id)
      .in("status", [...publicContentStatuses])
      .order("episode_number", { ascending: true });

    const episodeNumbers = (episodeRows ?? [])
      .map((episode) => Number(episode.episode_number))
      .filter((number) => Number.isInteger(number));
    const currentIndex = episodeNumbers.indexOf(episodeNumber);
    const creator = firstRelation(story.creator_profiles);
    const genre = firstRelation(story.genres);
    const episode = episodeRow as EpisodeRow;
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const poll = await getEpisodePoll(episode.id, user?.id ?? null);
    const authorVerification = creator?.user_id
      ? await getPublicVerificationBadge(creator.user_id)
      : null;

    return {
      data: {
        story: {
          id: story.id,
          title: story.title,
          slug: story.slug,
          creatorId: creator?.id ?? null,
          creatorUserId: creator?.user_id ?? null,
          creatorName: creator?.pen_name ?? null,
          authorVerification,
          coverUrl: story.cover_url,
          hook: story.hook,
          genreName: genre?.name ?? null,
          ageRating: story.age_rating ?? "all_ages",
          sensitiveFlags: story.sensitive_flags ?? [],
          status: story.status,
          visibility: story.visibility
        },
        episode: {
          id: episode.id,
          episodeNumber: episode.episode_number,
          title: episode.title,
          content: episode.content ?? "",
          wordCount: Number(episode.word_count ?? 0),
          publishedAt: episode.published_at,
          backgroundImageUrl: episode.background_image_url,
          seoTitle: episode.seo_title ?? null,
          seoDescription: episode.seo_description ?? null,
          seoKeywords: episode.seo_keywords ?? [],
          status: episode.status
        },
        previousEpisodeNumber:
          currentIndex > 0 ? episodeNumbers[currentIndex - 1] : null,
        nextEpisodeNumber:
          currentIndex >= 0 && currentIndex < episodeNumbers.length - 1
            ? episodeNumbers[currentIndex + 1]
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
