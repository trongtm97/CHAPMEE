import { analyticsEvents } from "@/lib/analytics/events";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { createClient } from "@/lib/data/server";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import { studioPath } from "@/lib/studio/constants";
import {
  computeDeltaPercent,
  deltaLabel,
  fillEngagementTimeline,
  fillTimelineDays,
  getAnalyticsRangeBounds,
  incrementDayMap,
  isInRange
} from "@/lib/studio/analytics-helpers";
import {
  normalizeAnalyticsContentFilter,
  normalizeAnalyticsRange
} from "@/lib/studio/analytics-query";
import {
  getStoryStatusLabel,
  resolveStoryDisplayStatus
} from "@/lib/studio/status-labels";
import type {
  StudioAnalyticsContentFilter,
  StudioAnalyticsInsight,
  StudioAnalyticsOverview,
  StudioAnalyticsPageData,
  StudioAnalyticsRange,
  StudioChapterAnalytics,
  StudioContentHealthIssue,
  StudioReelsAnalytics,
  StudioStoryAnalytics
} from "@/types/studio-analytics";
import type { StudioDbContentStatus } from "@/types/studio";

export type {
  StudioAnalyticsData,
  StudioAnalyticsOverview,
  StudioAnalyticsRange,
  StudioChapterAnalytics,
  StudioReelsAnalytics,
  StudioStoryAnalytics
} from "@/types/studio-analytics";

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

const REELS_VIEW_EVENTS = new Set<string>([
  analyticsEvents.reelsItemViewed,
  analyticsEvents.reelsFeedViewed,
  analyticsEvents.feedImpression
]);

const REELS_CTA_EVENTS = new Set<string>([
  analyticsEvents.reelsReadMoreClicked,
  analyticsEvents.feedReadMore
]);

const REELS_SHARE_EVENTS = new Set<string>([
  analyticsEvents.reelsShareClicked,
  analyticsEvents.feedShare,
  analyticsEvents.shareClicked
]);

const MS_STALE_DRAFT = 30 * 24 * 60 * 60 * 1000;

function toCompletionRate(completions: number, starts: number) {
  if (starts === 0) {
    return null;
  }

  return Math.round((completions / starts) * 100);
}

function formatVnd(value: number) {
  return Math.round(value);
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function emptyPageData(
  range: StudioAnalyticsRange,
  content: StudioAnalyticsContentFilter,
  error: string | null = null
): StudioAnalyticsPageData {
  const emptyOverview: StudioAnalyticsOverview = {
    comments: 0,
    completedChapters: 0,
    completionRate: 0,
    hasMonetization: false,
    newFollows: 0,
    reads: 0,
    revenueVnd: null,
    saves: 0,
    reelsCtaClicks: 0,
    reelsCtr: null,
    reelsViews: 0,
    uniqueReaders: 0
  };

  return {
    activeContent: content,
    activeRange: range,
    chapters: [],
    community: {
      newComments: 0,
      reported: 0,
      topStories: [],
      unreplied: 0
    },
    engagementTimeline: [],
    error,
    hasAnyData: false,
    healthIssues: [],
    healthIssuesTotal: 0,
    insights: [],
    overview: emptyOverview,
    overviewDeltas: {},
    readTimeline: [],
    reels: [],
    reelsSummary: { ctaClicks: 0, publishedCount: 0, totalViews: 0 },
    search: "",
    sourceBreakdown: {
      chapter: 0,
      community: 0,
      hasTracking: false,
      reels: 0,
      story: 0
    },
    stories: [],
    storyOptions: [],
    updatedAt: new Date().toISOString()
  };
}

export function getStudioAnalyticsRange(
  value: string | undefined
): StudioAnalyticsRange {
  return normalizeAnalyticsRange(value);
}

export { normalizeAnalyticsRange, normalizeAnalyticsContentFilter };

export async function getStudioAnalytics(
  creatorProfile: CreatorProfile,
  profileUserId: string,
  options: {
    range?: StudioAnalyticsRange;
    content?: StudioAnalyticsContentFilter;
    storyId?: string;
    search?: string;
  } = {}
): Promise<StudioAnalyticsPageData> {
  const activeRange = options.range ?? "30d";
  const activeContent = options.content ?? "all";
  const search = (options.search ?? "").trim().toLowerCase();
  const bounds = getAnalyticsRangeBounds(activeRange);
  const rangeStart = bounds.currentStart;

  try {
    const db = await createClient();

    const { data: storyRows, error: storiesError } = await db
      .from("stories")
      .select(
        "id, title, slug, status, visibility, is_completed, updated_at, cover_url, hook, short_description"
      )
      .eq("creator_id", creatorProfile.id)
      .order("updated_at", { ascending: false });

    if (storiesError) {
      throw storiesError;
    }

    const allStories = storyRows ?? [];
    const storyOptions = allStories.map((s) => ({ id: s.id, title: s.title }));

    let stories = allStories;

    if (options.storyId) {
      stories = stories.filter((s) => s.id === options.storyId);
    }

    if (search) {
      stories = stories.filter((s) => s.title.toLowerCase().includes(search));
    }

    const storyIds = stories.map((story) => story.id);

    if (storyIds.length === 0) {
      return {
        ...emptyPageData(activeRange, activeContent),
        activeStoryId: options.storyId,
        search: options.search ?? "",
        storyOptions
      };
    }

    const { data: episodeRows, error: episodesError } = await db
      .from("episodes")
      .select("id, story_id, episode_number, title, status, published_at, updated_at")
      .in("story_id", storyIds)
      .order("episode_number", { ascending: true });

    if (episodesError) {
      throw episodesError;
    }

    const episodes = episodeRows ?? [];
    const episodeIds = episodes.map((episode) => episode.id);
    const storyById = new Map(stories.map((story) => [story.id, story]));
    const episodesByStory = new Map<string, typeof episodes>();

    for (const episode of episodes) {
      const list = episodesByStory.get(episode.story_id) ?? [];
      list.push(episode);
      episodesByStory.set(episode.story_id, list);
    }

    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(db, storyIds);

    const storyMetrics = new Map(
      stories.map((story) => {
        const genreName = taxonomyByStory.get(story.id)?.mainGenreName ?? null;

        return [
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
            genreLabel: genreName,
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
        ];
      })
    );

    const chapterMetrics = new Map(
      episodes.map((episode) => {
        const story = storyById.get(episode.story_id);

        return [
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
            openHref: story
              ? `/stories/${story.slug}/episodes/${episode.episode_number}`
              : "#",
            publishedAt: episode.published_at,
            reads: 0,
            storyId: episode.story_id,
            storyTitle: story?.title ?? "Truyện",
            title: episode.title
          } satisfies StudioChapterAnalytics
        ];
      })
    );

    const trackedTargetIds = [...storyIds, ...episodeIds];
    const eventFetchStart =
      bounds.previousStart ?? bounds.currentStart ?? undefined;

    let eventsQuery = trackedTargetIds.length
      ? db
          .from("analytics_events")
          .select("event_name, target_id, user_id, created_at")
          .in("target_id", trackedTargetIds)
      : null;

    let reelsEventsQuery = trackedTargetIds.length
      ? db
          .from("analytics_events")
          .select("event_name, target_id, created_at")
          .in("target_id", trackedTargetIds)
          .in("event_name", [
            ...Array.from(REELS_VIEW_EVENTS),
            ...Array.from(REELS_CTA_EVENTS)
          ])
      : null;

    if (eventFetchStart && eventsQuery) {
      eventsQuery = eventsQuery.gte("created_at", eventFetchStart);
    }

    if (eventFetchStart && reelsEventsQuery) {
      reelsEventsQuery = reelsEventsQuery.gte("created_at", eventFetchStart);
    }

    const [
      eventsResult,
      savesResult,
      followsResult,
      commentsResult,
      walletResult,
      revenueTxResult,
      reelsRowsResult,
      reelsEventsResult,
      reportsResult
    ] = await Promise.all([
      eventsQuery ?? Promise.resolve({ data: [], error: null }),
      rangeStart
        ? db
            .from("bookshelf_items")
            .select("story_id, created_at")
            .eq("status", "saved")
            .in("story_id", storyIds)
            .gte("created_at", eventFetchStart ?? rangeStart)
        : db
            .from("bookshelf_items")
            .select("story_id, created_at")
            .eq("status", "saved")
            .in("story_id", storyIds),
      rangeStart
        ? db
            .from("follows")
            .select("id, created_at")
            .eq("creator_id", creatorProfile.id)
            .gte("created_at", eventFetchStart ?? rangeStart)
        : db
            .from("follows")
            .select("id, created_at")
            .eq("creator_id", creatorProfile.id),
      rangeStart
        ? db
            .from("comments")
            .select("id, story_id, episode_id, created_at, user_id")
            .eq("status", "visible")
            .in("story_id", storyIds)
            .is("parent_id", null)
            .gte("created_at", eventFetchStart ?? rangeStart)
        : db
            .from("comments")
            .select("id, story_id, episode_id, created_at, user_id")
            .eq("status", "visible")
            .in("story_id", storyIds)
            .is("parent_id", null),
      db
        .from("creator_wallets")
        .select("total_earned_vnd, available_revenue_vnd, pending_revenue_vnd")
        .eq("user_id", profileUserId)
        .maybeSingle(),
      rangeStart
        ? db
            .from("transactions")
            .select("net_amount_vnd, creator_gross_vnd, story_id, created_at")
            .eq("creator_user_id", profileUserId)
            .eq("status", "completed")
            .gte("created_at", rangeStart)
        : db
            .from("transactions")
            .select("net_amount_vnd, creator_gross_vnd, story_id, created_at")
            .eq("creator_user_id", profileUserId)
            .eq("status", "completed"),
      db
        .from("reels_items")
        .select(
          "id, hook, story_id, chapter_id, view_count, cta_click_count, status, updated_at, published_at, stories(title, slug), episodes(episode_number, title)"
        )
        .eq("owner_id", profileUserId)
        .order("updated_at", { ascending: false }),
      reelsEventsQuery ?? Promise.resolve({ data: [], error: null }),
      db
        .from("reports")
        .select("target_id")
        .eq("target_type", "comment")
        .in("status", ["pending", "reviewing", "open"])
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

    const readByDay = new Map<string, number>();
    const savesByDay = new Map<string, number>();
    const commentsByDay = new Map<string, number>();
    const followsByDay = new Map<string, number>();

    let currentReads = 0;
    let previousReads = 0;
    let currentSaves = 0;
    let previousSaves = 0;
    let currentComments = 0;
    let previousComments = 0;
    let currentFollows = 0;
    let previousFollows = 0;
    let currentCompletions = 0;
    let chapterStarts = 0;
    let reelsCtaCurrent = 0;
    let reelsCtaPrevious = 0;
    let reelsViewsCurrent = 0;
    let reelsViewsPrevious = 0;
    let storyReadEvents = 0;
    let chapterReadEvents = 0;
    let reelsViewEvents = 0;

    const uniqueReaderIds = new Set<string>();

    for (const event of eventsResult.data ?? []) {
      const createdAt = event.created_at as string;
      const targetId = event.target_id as string | null;
      const userId = event.user_id as string | null;
      const eventName = event.event_name as string;
      const inCurrent = isInRange(
        createdAt,
        bounds.currentStart,
        bounds.currentEnd
      );
      const inPrevious = isInRange(
        createdAt,
        bounds.previousStart,
        bounds.previousEnd
      );

      if (userId && inCurrent) {
        uniqueReaderIds.add(userId);
      }

      if (!targetId) {
        continue;
      }

      const isRead =
        (STORY_READ_EVENTS.has(eventName) && storyMetrics.has(targetId)) ||
        (CHAPTER_READ_EVENTS.has(eventName) && chapterMetrics.has(targetId));

      if (isRead) {
        if (inCurrent) {
          currentReads += 1;
          incrementDayMap(readByDay, createdAt);

          if (STORY_READ_EVENTS.has(eventName) && storyMetrics.has(targetId)) {
            storyMetrics.get(targetId)!.reads += 1;
            storyReadEvents += 1;
          }

          if (CHAPTER_READ_EVENTS.has(eventName) && chapterMetrics.has(targetId)) {
            chapterMetrics.get(targetId)!.reads += 1;
            chapterStarts += 1;
            chapterReadEvents += 1;
          }
        }

        if (inPrevious) {
          previousReads += 1;
        }
      }

      if (
        CHAPTER_COMPLETE_EVENTS.has(eventName) &&
        chapterMetrics.has(targetId) &&
        inCurrent
      ) {
        chapterMetrics.get(targetId)!.completions += 1;
        currentCompletions += 1;
      }
    }

    for (const save of savesResult.data ?? []) {
      const createdAt = save.created_at as string;
      const storyId = save.story_id as string;
      const inCurrent = isInRange(
        createdAt,
        bounds.currentStart,
        bounds.currentEnd
      );
      const inPrevious = isInRange(
        createdAt,
        bounds.previousStart,
        bounds.previousEnd
      );

      if (inCurrent) {
        currentSaves += 1;
        incrementDayMap(savesByDay, createdAt);

        if (storyMetrics.has(storyId)) {
          storyMetrics.get(storyId)!.saves += 1;
        }
      }

      if (inPrevious) {
        previousSaves += 1;
      }
    }

    const parentCommentIds: string[] = [];

    for (const comment of commentsResult.data ?? []) {
      const createdAt = comment.created_at as string;
      const storyId = comment.story_id as string | null;
      const episodeId = comment.episode_id as string | null;
      const inCurrent = isInRange(
        createdAt,
        bounds.currentStart,
        bounds.currentEnd
      );
      const inPrevious = isInRange(
        createdAt,
        bounds.previousStart,
        bounds.previousEnd
      );

      if (inCurrent) {
        currentComments += 1;
        incrementDayMap(commentsByDay, createdAt);
        parentCommentIds.push(comment.id as string);

        if (storyId && storyMetrics.has(storyId)) {
          storyMetrics.get(storyId)!.comments += 1;
        }

        if (episodeId && chapterMetrics.has(episodeId)) {
          chapterMetrics.get(episodeId)!.comments += 1;
        }
      }

      if (inPrevious) {
        previousComments += 1;
      }
    }

    for (const follow of followsResult.data ?? []) {
      const createdAt = follow.created_at as string;
      const inCurrent = isInRange(
        createdAt,
        bounds.currentStart,
        bounds.currentEnd
      );
      const inPrevious = isInRange(
        createdAt,
        bounds.previousStart,
        bounds.previousEnd
      );

      if (inCurrent) {
        currentFollows += 1;
        incrementDayMap(followsByDay, createdAt);
      }

      if (inPrevious) {
        previousFollows += 1;
      }
    }

    let unreplied = parentCommentIds.length;

    if (parentCommentIds.length > 0) {
      const { data: authorReplies } = await db
        .from("comments")
        .select("parent_id")
        .in("parent_id", parentCommentIds)
        .eq("user_id", profileUserId)
        .neq("status", "deleted");

      const repliedParents = new Set(
        (authorReplies ?? []).map((row) => row.parent_id).filter(Boolean)
      );
      unreplied = parentCommentIds.filter((id) => !repliedParents.has(id)).length;
    }

    const reportedCount = (reportsResult.data ?? []).length;

    let revenueVnd: number | null = null;
    let hasMonetization = false;

    if (!walletResult.error && walletResult.data) {
      hasMonetization = true;
    }

    const txRows = (revenueTxResult.data ?? []).filter((row) =>
      isInRange(
        row.created_at as string,
        bounds.currentStart,
        bounds.currentEnd
      )
    );

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

    const reelsEventViews = new Map<string, number>();
    const reelsEventCtas = new Map<string, number>();

    for (const event of reelsEventsResult.data ?? []) {
      const createdAt = event.created_at as string;
      const targetId = event.target_id as string | null;

      if (!targetId) {
        continue;
      }

      const inCurrent = isInRange(
        createdAt,
        bounds.currentStart,
        bounds.currentEnd
      );
      const inPrevious = isInRange(
        createdAt,
        bounds.previousStart,
        bounds.previousEnd
      );

      if (REELS_VIEW_EVENTS.has(event.event_name)) {
        if (inCurrent) {
          reelsEventViews.set(targetId, (reelsEventViews.get(targetId) ?? 0) + 1);
          reelsViewEvents += 1;
        }

        if (inPrevious) {
          reelsViewsPrevious += 1;
        }
      }

      if (REELS_CTA_EVENTS.has(event.event_name)) {
        if (inCurrent) {
          reelsEventCtas.set(targetId, (reelsEventCtas.get(targetId) ?? 0) + 1);
          reelsCtaCurrent += 1;
        }

        if (inPrevious) {
          reelsCtaPrevious += 1;
        }
      }
    }

    const reelsRows = reelsRowsResult.data ?? [];
    const reelChapterIds = [
      ...new Set(
        reelsRows
          .map((row) => row.chapter_id as string | null)
          .filter((value): value is string => Boolean(value))
      )
    ];
    const reelStoryIds = [
      ...new Set(
        reelsRows
          .map((row) => row.story_id as string | null)
          .filter((value): value is string => Boolean(value))
      )
    ];

    const likeCountByChapter = new Map<string, number>();
    const commentCountByChapter = new Map<string, number>();
    const shareCountByStory = new Map<string, number>();

    if (reelChapterIds.length > 0) {
      const [reelReactionRows, reelCommentRows] = await Promise.all([
        db
          .from("reactions")
          .select("target_id")
          .eq("target_type", "episode")
          .eq("reaction_type", "like")
          .in("target_id", reelChapterIds),
        db
          .from("comments")
          .select("episode_id")
          .eq("status", "visible")
          .in("episode_id", reelChapterIds)
      ]);

      for (const row of reelReactionRows.data ?? []) {
        const chapterId = row.target_id as string | null;
        if (chapterId) {
          likeCountByChapter.set(chapterId, (likeCountByChapter.get(chapterId) ?? 0) + 1);
        }
      }

      for (const row of reelCommentRows.data ?? []) {
        const chapterId = row.episode_id as string | null;
        if (chapterId) {
          commentCountByChapter.set(
            chapterId,
            (commentCountByChapter.get(chapterId) ?? 0) + 1
          );
        }
      }
    }

    if (reelStoryIds.length > 0) {
      const { data: shareEventRows } = await db
        .from("analytics_events")
        .select("target_id")
        .in("target_id", reelStoryIds)
        .in("event_name", [...REELS_SHARE_EVENTS]);

      for (const row of shareEventRows ?? []) {
        const storyId = row.target_id as string | null;
        if (storyId) {
          shareCountByStory.set(storyId, (shareCountByStory.get(storyId) ?? 0) + 1);
        }
      }
    }

    const reelsByStory = new Set(
      reelsRows.map((row) => row.story_id as string).filter(Boolean)
    );

    let publishedInPeriod = 0;

    const reelsItems: StudioReelsAnalytics[] = reelsRows.map((row) => {
      const story = firstRelation(row.stories);
      const episode = firstRelation(row.episodes);
      const updatedAt = row.updated_at as string;
      const inPeriod =
        !rangeStart ||
        isInRange(updatedAt, bounds.currentStart, bounds.currentEnd);

      if (row.status === "published" && inPeriod) {
        publishedInPeriod += 1;
      }

      const dbViews = Number(row.view_count ?? 0);
      const dbCtas = Number(row.cta_click_count ?? 0);
      const eventViews = reelsEventViews.get(row.id as string) ?? 0;
      const eventCtas = reelsEventCtas.get(row.id as string) ?? 0;
      const views = rangeStart ? eventViews : Math.max(dbViews, eventViews);
      const ctaClicks = rangeStart ? eventCtas : Math.max(dbCtas, eventCtas);

      if (inPeriod || !rangeStart) {
        reelsViewsCurrent += views;
      }

      return {
        chapterLabel: episode
          ? `Ch.${episode.episode_number}: ${episode.title}`
          : story?.title ?? "Truyện",
        commentCount: row.chapter_id
          ? (commentCountByChapter.get(String(row.chapter_id)) ?? 0)
          : 0,
        ctaClicks,
        ctaRate: views > 0 ? Math.round((ctaClicks / views) * 100) : null,
        editHref: studioPath(`/reels/${row.id}/edit`),
        hook: (row.hook as string) || "—",
        id: row.id as string,
        likeCount: row.chapter_id
          ? (likeCountByChapter.get(String(row.chapter_id)) ?? 0)
          : 0,
        saveCount: storyMetrics.get(String(row.story_id))?.saves ?? 0,
        shareCount: shareCountByStory.get(String(row.story_id)) ?? 0,
        status: row.status as string,
        storyTitle: story?.title ?? "—",
        views
      };
    });

    if (!rangeStart) {
      reelsCtaCurrent = reelsItems.reduce((sum, row) => sum + row.ctaClicks, 0);
    }

    const storyAnalytics = [...storyMetrics.values()]
      .filter((row) => {
        if (!search) {
          return true;
        }

        return row.title.toLowerCase().includes(search);
      })
      .sort(
        (a, b) => b.reads + b.saves + b.comments - (a.reads + a.saves + a.comments)
      );

    const chapterAnalytics = [...chapterMetrics.values()]
      .map((chapter) => ({
        ...chapter,
        completionRate: toCompletionRate(chapter.completions, chapter.reads)
      }))
      .filter((chapter) => {
        if (!search) {
          return true;
        }

        return (
          chapter.title.toLowerCase().includes(search) ||
          chapter.storyTitle.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.reads + b.completions - (a.reads + a.completions));

    const overview: StudioAnalyticsOverview = {
      comments: currentComments,
      completedChapters: currentCompletions,
      completionRate: toCompletionRate(currentCompletions, chapterStarts) ?? 0,
      hasMonetization,
      newFollows: currentFollows,
      reads: currentReads,
      revenueVnd,
      saves: currentSaves,
      reelsCtaClicks: reelsCtaCurrent,
      reelsCtr:
        reelsViewsCurrent > 0
          ? Math.round((reelsCtaCurrent / reelsViewsCurrent) * 100)
          : null,
      reelsViews: reelsViewsCurrent,
      uniqueReaders: uniqueReaderIds.size
    };

    const overviewDeltas = {
      comments: {
        label: deltaLabel(computeDeltaPercent(currentComments, previousComments)),
        value: computeDeltaPercent(currentComments, previousComments)
      },
      follows: {
        label: deltaLabel(computeDeltaPercent(currentFollows, previousFollows)),
        value: computeDeltaPercent(currentFollows, previousFollows)
      },
      reads: {
        label: deltaLabel(computeDeltaPercent(currentReads, previousReads)),
        value: computeDeltaPercent(currentReads, previousReads)
      },
      saves: {
        label: deltaLabel(computeDeltaPercent(currentSaves, previousSaves)),
        value: computeDeltaPercent(currentSaves, previousSaves)
      }
    };

    const hasTracking =
      (eventsResult.data ?? []).length > 0 ||
      currentReads > 0 ||
      reelsViewEvents > 0;

    const sourceBreakdown = {
      chapter: chapterReadEvents,
      community: currentComments,
      hasTracking,
      reels: reelsViewEvents,
      story: storyReadEvents
    };

    const topCommentStories = [...storyAnalytics]
      .filter((s) => s.comments > 0)
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 3)
      .map((s) => ({
        count: s.comments,
        href: studioPath("/comments") + `?story=${s.id}`,
        storyId: s.id,
        title: s.title
      }));

    const healthIssues = buildHealthIssues({
      episodes,
      episodesByStory,
      reelsByStory,
      stories: allStories,
      unreplied
    });

    const insights = buildInsights({
      overview,
      publishedInPeriod,
      storyAnalytics,
      chapterAnalytics,
      unreplied,
      healthIssues
    });

    const hasAnyData =
      overview.reads > 0 ||
      overview.saves > 0 ||
      overview.comments > 0 ||
      overview.newFollows > 0 ||
      overview.reelsCtaClicks > 0 ||
      overview.reelsViews > 0 ||
      reelsItems.some((row) => row.views > 0) ||
      (overview.revenueVnd ?? 0) > 0 ||
      allStories.length > 0;

    return {
      activeContent,
      activeRange,
      activeStoryId: options.storyId,
      chapters: filterByContent(chapterAnalytics, activeContent),
      community: {
        newComments: currentComments,
        reported: reportedCount,
        topStories: topCommentStories,
        unreplied
      },
      engagementTimeline: fillEngagementTimeline(
        savesByDay,
        commentsByDay,
        followsByDay,
        bounds
      ),
      error: null,
      hasAnyData,
      healthIssues: healthIssues.slice(0, 5),
      healthIssuesTotal: healthIssues.length,
      insights: insights.slice(0, 5),
      overview,
      overviewDeltas,
      readTimeline: fillTimelineDays(readByDay, bounds),
      reels: filterByContent(reelsItems, activeContent),
      reelsSummary: {
        ctaClicks: reelsCtaCurrent,
        publishedCount: publishedInPeriod,
        totalViews: reelsViewsCurrent
      },
      search: options.search ?? "",
      sourceBreakdown,
      stories: filterByContent(storyAnalytics, activeContent),
      storyOptions,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...emptyPageData(
        activeRange,
        activeContent,
        error instanceof Error ? error.message : "Không tải được thống kê Studio."
      ),
      activeStoryId: options.storyId,
      search: options.search ?? ""
    };
  }
}

function filterByContent<T>(
  items: T[],
  content: StudioAnalyticsContentFilter
): T[] {
  if (content === "all") {
    return items;
  }

  if (content === "story" || content === "chapter" || content === "reels") {
    return items;
  }

  return items;
}

function buildHealthIssues(input: {
  stories: Array<{
    id: string;
    title: string;
    cover_url: string | null;
    hook: string | null;
    short_description: string | null;
  }>;
  episodes: Array<{
    story_id: string;
    status: string;
    published_at: string | null;
    updated_at: string;
  }>;
  episodesByStory: Map<string, typeof input.episodes>;
  reelsByStory: Set<string>;
  unreplied: number;
}): StudioContentHealthIssue[] {
  const issues: StudioContentHealthIssue[] = [];
  let missingCover = 0;
  let missingDesc = 0;
  let noChapters = 0;
  let staleDrafts = 0;
  let noReels = 0;
  const now = Date.now();

  for (const story of input.stories) {
    if (!story.cover_url) {
      missingCover += 1;
    }

    if (!story.short_description?.trim() && !story.hook?.trim()) {
      missingDesc += 1;
    }

    const storyEpisodes = input.episodesByStory.get(story.id) ?? [];
    const hasPublished = storyEpisodes.some((e) => e.status === "published");

    if (!hasPublished) {
      noChapters += 1;
    }

    if (!input.reelsByStory.has(story.id)) {
      noReels += 1;
    }

    for (const episode of storyEpisodes) {
      if (
        episode.status === "draft" &&
        now - new Date(episode.updated_at).getTime() > MS_STALE_DRAFT
      ) {
        staleDrafts += 1;
      }
    }
  }

  if (missingCover > 0) {
    issues.push({
      count: missingCover,
      ctaHref: studioPath("/stories"),
      ctaLabel: "Bổ sung ảnh bìa",
      description: "Ảnh bìa giúp tăng tỷ lệ click từ Khám phá.",
      id: "missing-cover",
      priority: "high",
      title: "Truyện thiếu ảnh bìa"
    });
  }

  if (missingDesc > 0) {
    issues.push({
      count: missingDesc,
      ctaHref: studioPath("/stories"),
      ctaLabel: "Cập nhật mô tả",
      description: "Mô tả rõ ràng giúp độc giả hiểu nội dung truyện.",
      id: "missing-desc",
      priority: "medium",
      title: "Truyện chưa có mô tả"
    });
  }

  if (noChapters > 0) {
    issues.push({
      count: noChapters,
      ctaHref: studioPath("/stories"),
      ctaLabel: "Quản lý chương",
      description: "Xuất bản ít nhất một chương để nhận lượt đọc.",
      id: "no-chapters",
      priority: "high",
      title: "Truyện chưa có chương đăng"
    });
  }

  if (staleDrafts > 0) {
    issues.push({
      count: staleDrafts,
      ctaHref: studioPath("/drafts"),
      ctaLabel: "Xem nháp",
      description: "Chương nháp quá 30 ngày có thể làm chậm lịch đăng.",
      id: "stale-drafts",
      priority: "medium",
      title: "Chương nháp lâu ngày"
    });
  }

  if (noReels > 0) {
    issues.push({
      count: noReels,
      ctaHref: studioPath("/reels/new"),
      ctaLabel: "Tạo Reels",
      description: "Reels giúp kéo độc giả vào truyện từ feed.",
      id: "no-reels",
      priority: "low",
      title: "Truyện chưa có Reels giới thiệu"
    });
  }

  if (input.unreplied > 0) {
    issues.push({
      count: input.unreplied,
      ctaHref: studioPath("/comments") + "?filter=unreplied",
      ctaLabel: "Trả lời bình luận",
      description: "Phản hồi nhanh giúp giữ chân độc giả trung thành.",
      id: "unreplied-comments",
      priority: "high",
      title: "Bình luận chưa trả lời"
    });
  }

  return issues.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function buildInsights(input: {
  overview: StudioAnalyticsOverview;
  storyAnalytics: StudioStoryAnalytics[];
  chapterAnalytics: StudioChapterAnalytics[];
  publishedInPeriod: number;
  unreplied: number;
  healthIssues: StudioContentHealthIssue[];
}): StudioAnalyticsInsight[] {
  const insights: StudioAnalyticsInsight[] = [];
  const topStory = input.storyAnalytics[0];

  if (topStory && topStory.reads > 0) {
    insights.push({
      ctaHref: topStory.studioHref,
      ctaLabel: "Xem truyện",
      id: "top-story-reads",
      message: `"${topStory.title}" đang có lượt đọc cao nhất trong kỳ.`,
      tone: "success"
    });
  }

  const topChapter = [...input.chapterAnalytics].sort(
    (a, b) => b.comments - a.comments
  )[0];

  if (topChapter && topChapter.comments > 0) {
    insights.push({
      ctaHref: topChapter.editHref,
      ctaLabel: "Sửa chương",
      id: "top-chapter-comments",
      message: `Chương "${topChapter.title}" có nhiều bình luận mới.`,
      tone: "info"
    });
  }

  if (input.unreplied > 0) {
    insights.push({
      ctaHref: studioPath("/comments") + "?filter=unreplied",
      ctaLabel: "Xem bình luận",
      id: "unreplied",
      message: `Bạn có ${input.unreplied} bình luận chưa trả lời.`,
      tone: "warning"
    });
  }

  if (input.publishedInPeriod === 0) {
    insights.push({
      ctaHref: studioPath("/reels/new"),
      ctaLabel: "Tạo Reels",
      id: "no-reels-period",
      message: "Chưa có Reels đăng trong kỳ này — thử tạo từ chương nổi bật.",
      tone: "info"
    });
  }

  const coverIssue = input.healthIssues.find((i) => i.id === "missing-cover");

  if (coverIssue) {
    insights.push({
      ctaHref: coverIssue.ctaHref,
      ctaLabel: coverIssue.ctaLabel,
      id: "missing-cover-insight",
      message: `${coverIssue.count} truyện thiếu ảnh bìa có thể ảnh hưởng lượt click.`,
      tone: "warning"
    });
  }

  if (insights.length === 0 && input.overview.reads === 0) {
    insights.push({
      ctaHref: studioPath("/stories"),
      ctaLabel: "Viết chương mới",
      id: "get-started",
      message: "Bắt đầu xuất bản chương để thu thập thống kê lượt đọc.",
      tone: "info"
    });
  }

  return insights;
}
