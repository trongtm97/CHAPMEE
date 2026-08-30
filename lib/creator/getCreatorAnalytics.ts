import { createClient } from "@/lib/data/server";
import { analyticsEvents } from "@/lib/analytics/events";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";

export type CreatorAnalyticsRange = "7d" | "30d" | "90d" | "all";

export type CreatorAnalyticsOverview = {
  storyOpens: number;
  episodeStarts: number;
  completedChapters: number;
  completionRate: number;
  saves: number;
  follows: number;
  comments: number;
  reports: number;
};

export type CreatorStoryAnalytics = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  opens: number;
  episodeStarts: number;
  completions: number;
  saves: number;
  comments: number;
};

export type CreatorEpisodeAnalytics = {
  id: string;
  storyId: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  starts: number;
  completions: number;
  completionRate: number;
};

export type CreatorAnalyticsData = {
  activeRange: CreatorAnalyticsRange;
  overview: CreatorAnalyticsOverview;
  stories: CreatorStoryAnalytics[];
  episodes: CreatorEpisodeAnalytics[];
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
};

type AnalyticsEventRow = {
  event_name: string;
  target_id: string | null;
};

type SaveRow = {
  story_id: string;
};

type FollowRow = {
  id: string;
};

type CommentRow = {
  id: string;
  story_id: string | null;
  episode_id: string | null;
};

const validRanges = new Set<CreatorAnalyticsRange>(["7d", "30d", "90d", "all"]);

function getRangeStart(range: CreatorAnalyticsRange) {
  if (range === "all") {
    return null;
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function applyDateFilter<Query>(
  query: Query,
  rangeStart: string | null
): Query {
  if (!rangeStart) {
    return query;
  }

  return (
    query as {
      gte: (column: string, value: string) => Query;
    }
  ).gte("created_at", rangeStart);
}

function createOverview(): CreatorAnalyticsOverview {
  return {
    storyOpens: 0,
    episodeStarts: 0,
    completedChapters: 0,
    completionRate: 0,
    saves: 0,
    follows: 0,
    comments: 0,
    reports: 0
  };
}

function toCompletionRate(completions: number, starts: number) {
  if (starts === 0) {
    return 0;
  }

  return Math.round((completions / starts) * 100);
}

export function getCreatorAnalyticsRange(
  value: string | undefined
): CreatorAnalyticsRange {
  if (value && validRanges.has(value as CreatorAnalyticsRange)) {
    return value as CreatorAnalyticsRange;
  }

  return "30d";
}

export async function getCreatorAnalytics(
  creatorProfile: CreatorProfile,
  activeRange: CreatorAnalyticsRange
): Promise<CreatorAnalyticsData> {
  const overview = createOverview();

  try {
    const db = await createClient();
    const rangeStart = getRangeStart(activeRange);

    const { data: storyRows, error: storiesError } = await db
      .from("stories")
      .select("id, title, slug, public_code")
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false });

    if (storiesError) {
      throw storiesError;
    }

    const stories = (storyRows ?? []) as StoryRow[];
    const storyIds = stories.map((story) => story.id);

    if (storyIds.length === 0) {
      return {
        activeRange,
        error: null,
        episodes: [],
        overview,
        stories: []
      };
    }

    const { data: episodeRows, error: episodesError } = await db
      .from("episodes")
      .select("id, story_id, episode_number, title")
      .in("story_id", storyIds)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    const episodes = (episodeRows ?? []) as EpisodeRow[];
    const episodeIds = episodes.map((episode) => episode.id);
    const storyById = new Map(stories.map((story) => [story.id, story]));
    const episodeById = new Map(
      episodes.map((episode) => [episode.id, episode])
    );

    const storyMetrics = new Map<string, CreatorStoryAnalytics>(
      stories.map((story) => [
        story.id,
        {
          id: story.id,
          title: story.title,
          slug: story.slug,
          publicCode: story.public_code,
          comments: 0,
          completions: 0,
          episodeStarts: 0,
          opens: 0,
          saves: 0
        }
      ])
    );

    const episodeMetrics = new Map<string, CreatorEpisodeAnalytics>(
      episodes.map((episode) => [
        episode.id,
        {
          id: episode.id,
          storyId: episode.story_id,
          storyTitle: storyById.get(episode.story_id)?.title ?? "Story",
          completionRate: 0,
          completions: 0,
          episodeNumber: episode.episode_number,
          starts: 0,
          title: episode.title
        }
      ])
    );

    const trackedTargetIds = [...storyIds, ...episodeIds];
    const emptyAnalyticsResult = { data: [], error: null };
    const [eventsResult, savesResult, followsResult, commentsResult] =
      await Promise.all([
        trackedTargetIds.length
          ? applyDateFilter(
              db
                .from("analytics_events")
                .select("event_name, target_id")
                .in("target_id", trackedTargetIds),
              rangeStart
            )
          : emptyAnalyticsResult,
        applyDateFilter(
          db
            .from("bookshelf_items")
            .select("story_id")
            .eq("status", "saved")
            .in("story_id", storyIds),
          rangeStart
        ),
        applyDateFilter(
          db.from("follows").select("id").eq("creator_id", creatorProfile.id),
          rangeStart
        ),
        applyDateFilter(
          db
            .from("comments")
            .select("id, story_id, episode_id")
            .eq("status", "visible")
            .in("story_id", storyIds),
          rangeStart
        )
      ]);

    const firstError =
      eventsResult.error ??
      savesResult.error ??
      followsResult.error ??
      commentsResult.error;

    if (firstError) {
      throw firstError;
    }

    for (const event of (eventsResult.data ?? []) as AnalyticsEventRow[]) {
      const targetId = event.target_id;

      if (!targetId) {
        continue;
      }

      if (
        event.event_name === analyticsEvents.openStory &&
        storyMetrics.has(targetId)
      ) {
        storyMetrics.get(targetId)!.opens += 1;
        overview.storyOpens += 1;
      }

      if (
        event.event_name === analyticsEvents.startReading &&
        episodeById.has(targetId)
      ) {
        const episode = episodeById.get(targetId)!;
        episodeMetrics.get(targetId)!.starts += 1;
        storyMetrics.get(episode.story_id)!.episodeStarts += 1;
        overview.episodeStarts += 1;
      }

      if (
        event.event_name === analyticsEvents.completeChap &&
        episodeById.has(targetId)
      ) {
        const episode = episodeById.get(targetId)!;
        episodeMetrics.get(targetId)!.completions += 1;
        storyMetrics.get(episode.story_id)!.completions += 1;
        overview.completedChapters += 1;
      }

      if (
        event.event_name === analyticsEvents.reportCreated &&
        (storyMetrics.has(targetId) || episodeById.has(targetId))
      ) {
        overview.reports += 1;
      }
    }

    for (const save of (savesResult.data ?? []) as SaveRow[]) {
      const story = storyMetrics.get(save.story_id);

      if (story) {
        story.saves += 1;
        overview.saves += 1;
      }
    }

    overview.follows = ((followsResult.data ?? []) as FollowRow[]).length;

    for (const comment of (commentsResult.data ?? []) as CommentRow[]) {
      if (!comment.story_id) {
        continue;
      }

      const story = storyMetrics.get(comment.story_id);

      if (story) {
        story.comments += 1;
        overview.comments += 1;
      }
    }

    const storyAnalytics = [...storyMetrics.values()].sort(
      (first, second) =>
        second.opens +
        second.episodeStarts +
        second.completions +
        second.saves +
        second.comments -
        (first.opens +
          first.episodeStarts +
          first.completions +
          first.saves +
          first.comments)
    );

    const episodeAnalytics = [...episodeMetrics.values()]
      .map((episode) => ({
        ...episode,
        completionRate: toCompletionRate(episode.completions, episode.starts)
      }))
      .sort(
        (first, second) =>
          second.starts +
          second.completions -
          (first.starts + first.completions)
      );

    return {
      activeRange,
      error: null,
      episodes: episodeAnalytics,
      overview: {
        ...overview,
        completionRate: toCompletionRate(
          overview.completedChapters,
          overview.episodeStarts
        )
      },
      stories: storyAnalytics
    };
  } catch (error) {
    return {
      activeRange,
      error:
        error instanceof Error
          ? error.message
          : "Khong the tai creator analytics.",
      episodes: [],
      overview,
      stories: []
    };
  }
}
