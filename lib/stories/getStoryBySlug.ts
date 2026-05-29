import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { getCurrentStoryImage } from "@/lib/images/get-current-story-image";
import { createClient } from "@/lib/supabase/server";
import { SHORT_STORY_CHAPTER_THRESHOLD } from "@/lib/stories/chapter-ranges";
import { getPublicStoryEarlyFanStats } from "@/lib/supabase/early-fans";
import { syncStoryReadMilestones } from "@/lib/supabase/milestones";
import { getStoryPoll } from "@/lib/supabase/polls";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type { PollView } from "@/types/poll";
import type { StoryImage } from "@/types/story-images";
import type { PublicVerificationBadge } from "@/types/verification";

export type StoryDetail = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  coverUrl: string | null;
  currentImage: StoryImage | null;
  creatorId: string | null;
  creatorUserId: string | null;
  genreName: string | null;
  creatorName: string | null;
  authorVerification: PublicVerificationBadge | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  status: string;
  visibility: string;
  isCompleted: boolean;
  episodeCount: number;
  likeCount: number;
  saveCount: number;
  earlyFanCount: number;
  poll: PollView | null;
  tags: string[];
  episodes: StoryEpisode[];
  latestEpisodePublishedAt: string | null;
  comments: StoryComment[];
  originalsStatus: "none" | "candidate" | "under_review" | "original" | "declined" | "ended" | null;
};

export type StoryEpisode = {
  id: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
};

export type StoryComment = {
  id: string;
  content: string;
  createdAt: string;
  displayName: string | null;
};

export type StoryDetailResult = {
  story: StoryDetail | null;
  notFound: boolean;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  is_completed: boolean | null;
  status: string;
  visibility: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  genres: { name: string | null } | { name: string | null }[] | null;
  creator_profiles:
    | { id: string | null; user_id: string | null; pen_name: string | null }
    | { id: string | null; user_id: string | null; pen_name: string | null }[]
    | null;
};

type StoryTagRow = {
  tags: { name: string | null } | { name: string | null }[] | null;
};

type EpisodeRow = {
  id: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  published_at: string | null;
};

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  profiles:
    | { display_name: string | null; username: string | null }
    | { display_name: string | null; username: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryBySlug(slug: string): Promise<StoryDetailResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { data: storyRow, error: storyError } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, short_description, long_description, cover_url, is_completed, status, visibility, seo_title, seo_description, seo_keywords, canonical_url, genres(name), creator_profiles(id, user_id, pen_name)"
      )
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", [...publicContentStatuses])
      .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
      .maybeSingle();

    if (storyError) {
      throw storyError;
    }

    if (!storyRow) {
      return { story: null, notFound: true, error: null };
    }

    const story = storyRow as unknown as StoryRow;
    const [tagRows, episodeCountResult, commentRows, earlyFanStats, originalsStatusRow, currentImageResult] =
      await Promise.all([
      supabase.from("story_tags").select("tags(name)").eq("story_id", story.id),
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("story_id", story.id)
        .in("status", [...publicContentStatuses]),
      supabase
        .from("comments")
        .select("id, content, created_at, profiles(display_name, username)")
        .eq("story_id", story.id)
        .eq("status", "visible")
        .order("created_at", { ascending: false })
        .limit(5),
      getPublicStoryEarlyFanStats(story.id),
      supabase
        .from("story_originals_status")
        .select("status")
        .eq("story_id", story.id)
        .maybeSingle(),
      getCurrentStoryImage(supabase, story.id)
    ]);

    const totalEpisodeCount = episodeCountResult.count ?? 0;
    const shouldLoadAllEpisodes = totalEpisodeCount <= SHORT_STORY_CHAPTER_THRESHOLD;
    const episodeListQuery = supabase
      .from("episodes")
      .select("id, episode_number, title, excerpt, published_at")
      .eq("story_id", story.id)
      .in("status", [...publicContentStatuses]);

    const [{ data: episodeRowsData }, latestEpisodeResult] = await Promise.all([
      shouldLoadAllEpisodes
        ? episodeListQuery.order("episode_number", { ascending: true })
        : Promise.resolve({ data: [] }),
      shouldLoadAllEpisodes
        ? Promise.resolve({ data: null })
        : supabase
            .from("episodes")
            .select("published_at")
            .eq("story_id", story.id)
            .in("status", [...publicContentStatuses])
            .order("episode_number", { ascending: false })
            .limit(1)
            .maybeSingle()
    ]);

    const genre = firstRelation(story.genres);
    const creator = firstRelation(story.creator_profiles);
    const tags = ((tagRows.data ?? []) as unknown as StoryTagRow[])
      .map((row) => firstRelation(row.tags)?.name)
      .filter((tag): tag is string => Boolean(tag));
    const episodes = ((episodeRowsData ?? []) as unknown as EpisodeRow[]).map(
      (episode) => ({
        id: episode.id,
        episodeNumber: episode.episode_number,
        title: episode.title,
        excerpt: episode.excerpt,
        publishedAt: episode.published_at
      })
    );
    const comments = ((commentRows.data ?? []) as unknown as CommentRow[]).map(
      (comment) => {
        const profile = firstRelation(comment.profiles);

        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          displayName: profile?.display_name ?? profile?.username ?? null
        };
      }
    );
    const episodeIds = episodes.map((episode) => episode.id);
    const [storyLikeRows, episodeLikeRows, saveCountsResult, poll] = await Promise.all([
      supabase
        .from("reactions")
        .select("id")
        .eq("target_type", "story")
        .eq("reaction_type", "like")
        .eq("target_id", story.id),
      episodeIds.length > 0
        ? supabase
            .from("reactions")
            .select("id")
            .eq("target_type", "episode")
            .eq("reaction_type", "like")
            .in("target_id", episodeIds)
        : Promise.resolve({ data: [] }),
      supabase.rpc("get_public_story_save_counts", {
        input_story_ids: [story.id]
      }),
      getStoryPoll(story.id, user?.id ?? null)
    ]);
    const storySaveCount = Array.isArray(saveCountsResult.data)
      ? Number(saveCountsResult.data[0]?.save_count ?? 0)
      : 0;

    if (creator?.user_id && user?.id === creator.user_id && earlyFanStats) {
      await syncStoryReadMilestones({
        readCount: Number(earlyFanStats.readCount ?? 0),
        storyId: story.id,
        storyTitle: story.title,
        userId: creator.user_id
      });
    }

    const authorVerification = creator?.user_id
      ? await getPublicVerificationBadge(creator.user_id)
      : null;

    return {
      story: {
        id: story.id,
        title: story.title,
        slug: story.slug,
        hook: story.hook,
        shortDescription: story.short_description,
        longDescription: story.long_description,
        coverUrl: story.cover_url,
        currentImage: currentImageResult.error ? null : currentImageResult.image,
        creatorId: creator?.id ?? null,
        creatorUserId: creator?.user_id ?? null,
        genreName: genre?.name ?? null,
        creatorName: creator?.pen_name ?? null,
        authorVerification,
        seoTitle: story.seo_title ?? null,
        seoDescription: story.seo_description ?? null,
        seoKeywords: story.seo_keywords ?? [],
        canonicalUrl: story.canonical_url ?? null,
        status: story.status,
        visibility: story.visibility,
        isCompleted: Boolean(story.is_completed),
        episodeCount: totalEpisodeCount,
        likeCount:
          ((storyLikeRows.data ?? []) as Array<{ id: string }>).length +
          ((episodeLikeRows.data ?? []) as Array<{ id: string }>).length,
        saveCount: storySaveCount,
        earlyFanCount: earlyFanStats?.earlyFanCount ?? 0,
        poll,
        tags,
        episodes,
        latestEpisodePublishedAt:
          episodes[episodes.length - 1]?.publishedAt ??
          (latestEpisodeResult.data as { published_at?: string | null } | null)
            ?.published_at ??
          null,
        comments,
        originalsStatus: (originalsStatusRow.data?.status as StoryDetail["originalsStatus"]) ?? null
      },
      notFound: false,
      error: null
    };
  } catch (error) {
    return {
      story: null,
      notFound: false,
      error:
        error instanceof Error ? error.message : "Could not load story detail."
    };
  }
}
