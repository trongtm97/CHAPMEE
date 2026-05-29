import { analyticsEvents } from "@/lib/analytics/events";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { studioPath } from "@/lib/studio/constants";
import {
  getStoryStatusLabel,
  resolveStoryDisplayStatus
} from "@/lib/studio/status-labels";
import type { StudioDbContentStatus } from "@/types/studio";

export type StudioAnalyticsRange = "7d" | "30d" | "90d" | "all";

export type StudioAnalyticsOverview = {
  reads: number;
  uniqueReaders: number;
  saves: number;
  comments: number;
  newFollows: number;
  swipeCtaClicks: number;
  revenueVnd: number | null;
  hasMonetization: boolean;
  /** Hoàn thành chương — chỉ khi có tracking complete_chap/chapter_completed */
  completedChapters: number;
  completionRate: number;
};

export type StudioStoryAnalytics = {
  id: string;
  title: string;
  slug: string;
  status: string;
  displayStatus: string;
  updatedAt: string;
  reads: number;
  saves: number;
  comments: number;
  newFollows: number;
  revenueVnd: number | null;
  studioHref: string;
  chaptersHref: string;
};

export type StudioChapterAnalytics = {
  id: string;
  storyId: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  reads: number;
  comments: number;
  completions: number;
  completionRate: number | null;
  publishedAt: string | null;
  editHref: string;
};

export type StudioSwipeAnalytics = {
  id: string;
  hook: string;
  storyTitle: string;
  chapterLabel: string;
  views: number;
  ctaClicks: number;
  ctaRate: number | null;
  status: string;
  editHref: string;
};

export type StudioAnalyticsData = {
  activeRange: StudioAnalyticsRange;
  overview: StudioAnalyticsOverview;
  stories: StudioStoryAnalytics[];
  chapters: StudioChapterAnalytics[];
  swipes: StudioSwipeAnalytics[];
  hasAnyData: boolean;
  error: string | null;
};

const validRanges = new Set<StudioAnalyticsRange>(["7d", "30d", "90d", "all"]);

const STORY_READ_EVENTS = new Set([
  analyticsEvents.openStory,
  analyticsEvents.storyViewed,
  "story_viewed",
  "open_story"
]);

const CHAPTER_READ_EVENTS = new Set([
  analyticsEvents.startReading,
  analyticsEvents.chapterOpened,
  "chapter_opened",
  "start_reading"
]);

const CHAPTER_COMPLETE_EVENTS = new Set([
  analyticsEvents.completeChap,
  analyticsEvents.chapterCompleted,
  "complete_chap",
  "chapter_completed"
]);

const SWIPE_VIEW_EVENTS = new Set([
  analyticsEvents.swipeItemViewed,
  analyticsEvents.feedImpression,
  "swipe_view",
  "swipe_item_viewed",
  "feed_impression"
]);

const SWIPE_CTA_EVENTS = new Set([
  analyticsEvents.swipeReadMoreClicked,
  analyticsEvents.feedReadMore,
  "swipe_cta_click",
  "swipe_read_more_clicked",
  "feed_read_more"
]);

function getRangeStart(range: StudioAnalyticsRange) {
  if (range === "all") {
    return null;
  }

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function applyDateFilter<Query>(query: Query, rangeStart: string | null): Query {
  if (!rangeStart) {
    return query;
  }

  return (
    query as { gte: (column: string, value: string) => Query }
  ).gte("created_at", rangeStart);
}

function toCompletionRate(completions: number, starts: number) {
  if (starts === 0) {
    return null;
  }

  return Math.round((completions / starts) * 100);
}

function formatVnd(value: number) {
  return Math.round(value);
}

export function getStudioAnalyticsRange(value: string | undefined): StudioAnalyticsRange {
  if (value && validRanges.has(value as StudioAnalyticsRange)) {
    return value as StudioAnalyticsRange;
  }

  return "30d";
}

export async function getStudioAnalytics(
  creatorProfile: CreatorProfile,
  profileUserId: string,
  activeRange: StudioAnalyticsRange
): Promise<StudioAnalyticsData> {
  const emptyOverview: StudioAnalyticsOverview = {
    comments: 0,
    completedChapters: 0,
    completionRate: 0,
    hasMonetization: false,
    newFollows: 0,
    reads: 0,
    revenueVnd: null,
    saves: 0,
    swipeCtaClicks: 0,
    uniqueReaders: 0
  };

  try {
    const supabase = await createClient();
    const rangeStart = getRangeStart(activeRange);

    const { data: storyRows, error: storiesError } = await supabase
      .from("stories")
      .select("id, title, slug, status, visibility, is_completed, updated_at")
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false });

    if (storiesError) {
      throw storiesError;
    }

    const stories = storyRows ?? [];
    const storyIds = stories.map((story) => story.id);

    if (storyIds.length === 0) {
      return {
        activeRange,
        chapters: [],
        error: null,
        hasAnyData: false,
        overview: emptyOverview,
        stories: [],
        swipes: []
      };
    }

    const { data: episodeRows, error: episodesError } = await supabase
      .from("episodes")
      .select("id, story_id, episode_number, title, status, published_at")
      .in("story_id", storyIds)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    const episodes = episodeRows ?? [];
    const episodeIds = episodes.map((episode) => episode.id);
    const storyById = new Map(stories.map((story) => [story.id, story]));

    const storyMetrics = new Map(
      stories.map((story) => [
        story.id,
        {
          chaptersHref: studioPath(`/stories/${story.id}/chapters`),
          comments: 0,
          displayStatus: getStoryStatusLabel(
            resolveStoryDisplayStatus({
              isCompleted: Boolean(story.is_completed),
              status: story.status as StudioDbContentStatus,
              visibility: story.visibility as "public" | "private"
            })
          ),
          id: story.id,
          newFollows: 0,
          reads: 0,
          revenueVnd: null as number | null,
          saves: 0,
          slug: story.slug,
          status: story.status,
          studioHref: studioPath(`/stories/${story.id}/edit`),
          title: story.title,
          updatedAt: story.updated_at
        } satisfies StudioStoryAnalytics
      ])
    );

    const chapterMetrics = new Map(
      episodes.map((episode) => [
        episode.id,
        {
          comments: 0,
          completionRate: null as number | null,
          completions: 0,
          editHref: studioPath(
            `/stories/${episode.story_id}/chapters/${episode.id}/edit`
          ),
          episodeNumber: episode.episode_number,
          id: episode.id,
          publishedAt: episode.published_at,
          reads: 0,
          storyId: episode.story_id,
          storyTitle: storyById.get(episode.story_id)?.title ?? "Truyện",
          title: episode.title
        } satisfies StudioChapterAnalytics
      ])
    );

    const trackedTargetIds = [...storyIds, ...episodeIds];
    const uniqueReaderIds = new Set<string>();

    const [
      eventsResult,
      savesResult,
      followsResult,
      commentsResult,
      walletResult,
      revenueTxResult,
      swipeRowsResult,
      swipeEventsResult
    ] = await Promise.all([
      trackedTargetIds.length
        ? applyDateFilter(
            supabase
              .from("analytics_events")
              .select("event_name, target_id, user_id")
              .in("target_id", trackedTargetIds),
            rangeStart
          )
        : Promise.resolve({ data: [], error: null }),
      applyDateFilter(
        supabase
          .from("bookshelf_items")
          .select("story_id")
          .eq("status", "saved")
          .in("story_id", storyIds),
        rangeStart
      ),
      applyDateFilter(
        supabase.from("follows").select("id").eq("creator_id", creatorProfile.id),
        rangeStart
      ),
      applyDateFilter(
        supabase
          .from("comments")
          .select("id, story_id, episode_id")
          .eq("status", "visible")
          .in("story_id", storyIds),
        rangeStart
      ),
      supabase
        .from("creator_wallets")
        .select("total_earned_vnd, available_revenue_vnd, pending_revenue_vnd")
        .eq("user_id", profileUserId)
        .maybeSingle(),
      applyDateFilter(
        supabase
          .from("transactions")
          .select("net_amount_vnd, creator_gross_vnd, story_id")
          .eq("creator_user_id", profileUserId)
          .eq("status", "completed"),
        rangeStart
      ),
      supabase
        .from("swipe_items")
        .select(
          "id, hook, story_id, chapter_id, view_count, cta_click_count, status, stories(title), episodes(episode_number, title)"
        )
        .eq("owner_id", profileUserId)
        .order("updated_at", { ascending: false }),
      trackedTargetIds.length
        ? applyDateFilter(
            supabase
              .from("analytics_events")
              .select("event_name, target_id")
              .in("target_id", trackedTargetIds)
              .in("event_name", [
                ...Array.from(SWIPE_VIEW_EVENTS),
                ...Array.from(SWIPE_CTA_EVENTS)
              ]),
            rangeStart
          )
        : Promise.resolve({ data: [], error: null })
    ]);

    const firstError =
      eventsResult.error ??
      savesResult.error ??
      followsResult.error ??
      commentsResult.error ??
      revenueTxResult.error;

    if (firstError) {
      throw firstError;
    }

    let overviewReads = 0;
    let overviewCompletions = 0;
    let chapterStarts = 0;
    let swipeCtaClicks = 0;

    for (const event of eventsResult.data ?? []) {
      const targetId = event.target_id as string | null;
      const userId = event.user_id as string | null;

      if (userId) {
        uniqueReaderIds.add(userId);
      }

      if (!targetId) {
        continue;
      }

      const eventName = event.event_name as string;

      if (STORY_READ_EVENTS.has(eventName) && storyMetrics.has(targetId)) {
        storyMetrics.get(targetId)!.reads += 1;
        overviewReads += 1;
      }

      if (CHAPTER_READ_EVENTS.has(eventName) && chapterMetrics.has(targetId)) {
        chapterMetrics.get(targetId)!.reads += 1;
        chapterStarts += 1;
        overviewReads += 1;
      }

      if (CHAPTER_COMPLETE_EVENTS.has(eventName) && chapterMetrics.has(targetId)) {
        chapterMetrics.get(targetId)!.completions += 1;
        overviewCompletions += 1;
      }
    }

    for (const save of savesResult.data ?? []) {
      const story = storyMetrics.get(save.story_id as string);

      if (story) {
        story.saves += 1;
      }
    }

    const overviewFollows = (followsResult.data ?? []).length;

    for (const comment of commentsResult.data ?? []) {
      const storyId = comment.story_id as string | null;
      const episodeId = comment.episode_id as string | null;

      if (storyId && storyMetrics.has(storyId)) {
        storyMetrics.get(storyId)!.comments += 1;
      }

      if (episodeId && chapterMetrics.has(episodeId)) {
        chapterMetrics.get(episodeId)!.comments += 1;
      }
    }

    let revenueVnd: number | null = null;
    let hasMonetization = false;

    if (!walletResult.error && walletResult.data) {
      hasMonetization = true;
    }

    const txRows = revenueTxResult.data ?? [];

    if (txRows.length > 0) {
      revenueVnd = formatVnd(
        txRows.reduce(
          (sum, row) =>
            sum + Number(row.net_amount_vnd ?? row.creator_gross_vnd ?? 0),
          0
        )
      );
    } else if (hasMonetization && walletResult.data && !rangeStart) {
      revenueVnd = formatVnd(
        Number(walletResult.data.available_revenue_vnd ?? 0) +
          Number(walletResult.data.pending_revenue_vnd ?? 0)
      );
    }

    const swipeEventViews = new Map<string, number>();
    const swipeEventCtas = new Map<string, number>();

    for (const event of swipeEventsResult.data ?? []) {
      const targetId = event.target_id as string | null;

      if (!targetId) {
        continue;
      }

      if (SWIPE_VIEW_EVENTS.has(event.event_name as string)) {
        swipeEventViews.set(targetId, (swipeEventViews.get(targetId) ?? 0) + 1);
      }

      if (SWIPE_CTA_EVENTS.has(event.event_name as string)) {
        swipeEventCtas.set(targetId, (swipeEventCtas.get(targetId) ?? 0) + 1);
        swipeCtaClicks += 1;
      }
    }

    const swipes: StudioSwipeAnalytics[] = (swipeRowsResult.data ?? []).map((row) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      const episode = Array.isArray(row.episodes) ? row.episodes[0] : row.episodes;
      const dbViews = Number(row.view_count ?? 0);
      const dbCtas = Number(row.cta_click_count ?? 0);
      const eventViews = swipeEventViews.get(row.id as string) ?? 0;
      const eventCtas = swipeEventCtas.get(row.id as string) ?? 0;
      const views = rangeStart ? eventViews : Math.max(dbViews, eventViews);
      const ctaClicks = rangeStart ? eventCtas : Math.max(dbCtas, eventCtas);

      return {
        chapterLabel: episode
          ? `Ch.${episode.episode_number}: ${episode.title}`
          : story?.title ?? "Truyện",
        ctaClicks,
        ctaRate: views > 0 ? Math.round((ctaClicks / views) * 100) : null,
        editHref: studioPath(`/swipe/${row.id}/edit`),
        hook: (row.hook as string) || "—",
        id: row.id as string,
        status: row.status as string,
        storyTitle: story?.title ?? "—",
        views
      };
    });

    if (!rangeStart) {
      swipeCtaClicks = swipes.reduce((sum, row) => sum + row.ctaClicks, 0);
    }

    const storyAnalytics = [...storyMetrics.values()].sort(
      (a, b) => b.reads + b.saves + b.comments - (a.reads + a.saves + a.comments)
    );

    const chapterAnalytics = [...chapterMetrics.values()]
      .map((chapter) => ({
        ...chapter,
        completionRate: toCompletionRate(chapter.completions, chapter.reads)
      }))
      .sort((a, b) => b.reads + b.completions - (a.reads + a.completions));

    const overview: StudioAnalyticsOverview = {
      comments: storyAnalytics.reduce((sum, row) => sum + row.comments, 0),
      completedChapters: overviewCompletions,
      completionRate: toCompletionRate(overviewCompletions, chapterStarts) ?? 0,
      hasMonetization,
      newFollows: overviewFollows,
      reads: overviewReads,
      revenueVnd,
      saves: storyAnalytics.reduce((sum, row) => sum + row.saves, 0),
      swipeCtaClicks,
      uniqueReaders: uniqueReaderIds.size
    };

    const hasAnyData =
      overview.reads > 0 ||
      overview.saves > 0 ||
      overview.comments > 0 ||
      overview.newFollows > 0 ||
      overview.swipeCtaClicks > 0 ||
      swipes.some((row) => row.views > 0) ||
      (overview.revenueVnd ?? 0) > 0;

    return {
      activeRange,
      chapters: chapterAnalytics,
      error: null,
      hasAnyData,
      overview,
      stories: storyAnalytics,
      swipes: swipeRowsResult.error ? [] : swipes
    };
  } catch (error) {
    return {
      activeRange,
      chapters: [],
      error:
        error instanceof Error ? error.message : "Không tải được thống kê Studio.",
      hasAnyData: false,
      overview: emptyOverview,
      stories: [],
      swipes: []
    };
  }
}
