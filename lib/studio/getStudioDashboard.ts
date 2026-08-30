import { mapStoryStructureFromRow } from "@/lib/stories/story-structure";
import { createClient } from "@/lib/data/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type StudioDashboardStory = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected" | "published" | "archived";
  updatedAt: string;
  episodeCount: number;
  structureType: "chaptered" | "standalone";
  standaloneReadingTimeMinutes: number;
};

export type StudioDashboardEpisode = {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  title: string;
  status: "draft" | "pending" | "approved" | "rejected" | "published" | "archived";
  updatedAt: string;
  episodeNumber: number;
};

export type StudioDashboardStats = {
  totalStories: number;
  totalEpisodes: number;
  draftEpisodes: number;
  pendingEpisodes: number;
  publishedStories: number;
  recentComments: number;
};

export type StudioDashboardData = {
  creatorProfile: CreatorProfile;
  stats: StudioDashboardStats;
  recentStories: StudioDashboardStory[];
  recentEpisodes: StudioDashboardEpisode[];
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  status: StudioDashboardStory["status"];
  updated_at: string;
  structure_type?: string | null;
  standalone_reading_time_minutes?: number | null;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  title: string;
  status: StudioDashboardEpisode["status"];
  updated_at: string;
  episode_number: number;
  stories:
    | {
        id: string;
        title: string;
        slug: string;
      }
    | {
        id: string;
        title: string;
        slug: string;
      }[]
    | null;
};

type StoryEpisodeCountRow = {
  story_id: string;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

async function countOrZero(
  promiseLike: PromiseLike<{
    count?: number | null;
    error: { message: string } | null;
  }>
) {
  const { count, error } = await promiseLike;

  return {
    count: count ?? 0,
    error: error?.message ?? null
  };
}

export async function getStudioDashboard(
  creatorProfile: CreatorProfile
): Promise<StudioDashboardData> {
  try {
    const db = await createClient();
    const recentWindow = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [
      recentStoriesResult,
      recentEpisodesResult,
      totalStoriesResult,
      totalEpisodesResult,
      draftEpisodesResult,
      pendingEpisodesResult,
      publishedStoriesResult,
      recentCommentsResult
    ] = await Promise.all([
      db
        .from("stories")
        .select("id, title, slug, status, updated_at, structure_type, standalone_reading_time_minutes")
        .eq("creator_id", creatorProfile.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      db
        .from("episodes")
        .select("id, story_id, title, status, updated_at, episode_number, stories!inner(id, title, slug)")
        .eq("stories.creator_id", creatorProfile.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      countOrZero(
        db
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorProfile.id)
      ),
      countOrZero(
        db
          .from("episodes")
          .select("id, stories!inner(creator_id)", { count: "exact", head: true })
          .eq("stories.creator_id", creatorProfile.id)
      ),
      countOrZero(
        db
          .from("episodes")
          .select("id, stories!inner(creator_id)", { count: "exact", head: true })
          .eq("stories.creator_id", creatorProfile.id)
          .eq("status", "draft")
      ),
      countOrZero(
        db
          .from("episodes")
          .select("id, stories!inner(creator_id)", { count: "exact", head: true })
          .eq("stories.creator_id", creatorProfile.id)
          .eq("status", "pending")
      ),
      countOrZero(
        db
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorProfile.id)
          .eq("status", "published")
          .eq("visibility", "public")
      ),
      countOrZero(
        db
          .from("comments")
          .select("id, stories!inner(creator_id)", { count: "exact", head: true })
          .eq("stories.creator_id", creatorProfile.id)
          .eq("status", "visible")
          .gte("created_at", recentWindow)
      )
    ]);

    const recentStories = (recentStoriesResult.data ?? []) as StoryRow[];
    const recentEpisodes = (recentEpisodesResult.data ?? []) as EpisodeRow[];
    const storyIds = recentStories.map((story) => story.id);
    const episodeCountByStory = new Map<string, number>();

    if (storyIds.length > 0) {
      const { data: storyEpisodeRows, error: storyEpisodeError } =
        await db
          .from("episodes")
          .select("story_id, stories!inner(creator_id)")
          .eq("stories.creator_id", creatorProfile.id)
          .in("story_id", storyIds);

      if (storyEpisodeError) {
        throw storyEpisodeError;
      }

      for (const episode of (storyEpisodeRows ?? []) as StoryEpisodeCountRow[]) {
        episodeCountByStory.set(
          episode.story_id,
          (episodeCountByStory.get(episode.story_id) ?? 0) + 1
        );
      }
    }

    const errors = [
      recentStoriesResult.error?.message,
      recentEpisodesResult.error?.message,
      totalStoriesResult.error,
      totalEpisodesResult.error,
      draftEpisodesResult.error,
      pendingEpisodesResult.error,
      publishedStoriesResult.error
    ].filter(Boolean) as string[];

    return {
      creatorProfile,
      error: errors[0] ?? null,
      recentEpisodes: recentEpisodes.map((episode) => {
        const story = firstRelation(episode.stories);

        return {
          id: episode.id,
          episodeNumber: episode.episode_number,
          storyId: story?.id ?? episode.story_id,
          storySlug: story?.slug ?? "",
          storyTitle: story?.title ?? "Truyện",
          status: episode.status,
          title: episode.title,
          updatedAt: episode.updated_at
        };
      }),
      recentStories: recentStories.map((story) => {
        const structure = mapStoryStructureFromRow(story);
        return {
          id: story.id,
          episodeCount: episodeCountByStory.get(story.id) ?? 0,
          slug: story.slug,
          status: story.status,
          structureType: structure.structureType,
          standaloneReadingTimeMinutes: structure.standaloneReadingTimeMinutes,
          title: story.title,
          updatedAt: story.updated_at
        };
      }),
      stats: {
        draftEpisodes: draftEpisodesResult.count,
        pendingEpisodes: pendingEpisodesResult.count,
        publishedStories: publishedStoriesResult.count,
        recentComments: recentCommentsResult.count,
        totalEpisodes: totalEpisodesResult.count,
        totalStories: totalStoriesResult.count
      }
    };
  } catch (error) {
    return {
      creatorProfile,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải Studio dashboard.",
      recentEpisodes: [],
      recentStories: [],
      stats: {
        draftEpisodes: 0,
        pendingEpisodes: 0,
        publishedStories: 0,
        recentComments: 0,
        totalEpisodes: 0,
        totalStories: 0
      }
    };
  }
}
