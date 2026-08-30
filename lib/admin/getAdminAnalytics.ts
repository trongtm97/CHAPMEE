import { createClient } from "@/lib/data/server";
import { analyticsEvents } from "@/lib/analytics/events";

export type AdminAnalyticsRange = "7d" | "30d" | "all";

export type AdminPlatformMetrics = {
  users: number;
  creators: number;
  stories: number;
  episodes: number;
  pendingStories: number;
  pendingEpisodes: number;
  approvedStories: number;
  comments: number;
  reports: number;
  communityPosts: number;
};

export type AdminEngagementMetrics = {
  openStory: number;
  startReading: number;
  completeChap: number;
  nextChapClick: number;
  feedImpression: number;
  feedReadMore: number;
};

export type AdminSafetyMetrics = {
  reports: number;
  hiddenComments: number;
  rejectedStories: number;
  rejectedEpisodes: number;
  pendingCommunityPosts: number;
};

export type AdminAnalyticsData = {
  activeRange: AdminAnalyticsRange;
  platform: AdminPlatformMetrics;
  engagement: AdminEngagementMetrics;
  safety: AdminSafetyMetrics;
  error: string | null;
};

const validRanges = new Set<AdminAnalyticsRange>(["7d", "30d", "all"]);

function getRangeStart(range: AdminAnalyticsRange) {
  if (range === "all") {
    return null;
  }

  const days = range === "7d" ? 7 : 30;
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

function emptyData(activeRange: AdminAnalyticsRange): AdminAnalyticsData {
  return {
    activeRange,
    engagement: {
      completeChap: 0,
      feedImpression: 0,
      feedReadMore: 0,
      nextChapClick: 0,
      openStory: 0,
      startReading: 0
    },
    error: null,
    platform: {
      approvedStories: 0,
      comments: 0,
      communityPosts: 0,
      creators: 0,
      episodes: 0,
      pendingEpisodes: 0,
      pendingStories: 0,
      reports: 0,
      stories: 0,
      users: 0
    },
    safety: {
      hiddenComments: 0,
      pendingCommunityPosts: 0,
      rejectedEpisodes: 0,
      rejectedStories: 0,
      reports: 0
    }
  };
}

export function getAdminAnalyticsRange(
  value: string | undefined
): AdminAnalyticsRange {
  if (value && validRanges.has(value as AdminAnalyticsRange)) {
    return value as AdminAnalyticsRange;
  }

  return "30d";
}

export async function getAdminAnalytics(
  activeRange: AdminAnalyticsRange
): Promise<AdminAnalyticsData> {
  const fallback = emptyData(activeRange);

  try {
    const db = await createClient();
    const rangeStart = getRangeStart(activeRange);

    const [
      users,
      creators,
      stories,
      episodes,
      pendingStories,
      pendingEpisodes,
      approvedStories,
      comments,
      reports,
      communityPosts,
      hiddenComments,
      rejectedStories,
      rejectedEpisodes,
      pendingCommunityPosts,
      openStory,
      startReading,
      completeChap,
      nextChapClick,
      feedImpression,
      feedReadMore
    ] = await Promise.all([
      applyDateFilter(
        db.from("profiles").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("creator_profiles")
          .select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db.from("stories").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db.from("episodes").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("stories")
          .select("id", { count: "exact", head: true })
          .in("status", ["approved", "published"]),
        rangeStart
      ),
      applyDateFilter(
        db.from("comments").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db.from("reports").select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("community_posts")
          .select("id", { count: "exact", head: true }),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("comments")
          .select("id", { count: "exact", head: true })
          .in("status", ["hidden", "deleted"]),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("status", "rejected"),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("status", "rejected"),
        rangeStart
      ),
      applyDateFilter(
        db
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        rangeStart
      ),
      eventCount(analyticsEvents.openStory),
      eventCount(analyticsEvents.startReading),
      eventCount(analyticsEvents.completeChap),
      eventCount(analyticsEvents.nextChapClick),
      eventCount(analyticsEvents.feedImpression),
      eventCount(analyticsEvents.feedReadMore)
    ]);

    function eventCount(eventName: string) {
      return applyDateFilter(
        db
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_name", eventName),
        rangeStart
      );
    }

    const error = [
      users,
      creators,
      stories,
      episodes,
      pendingStories,
      pendingEpisodes,
      approvedStories,
      comments,
      reports,
      communityPosts,
      hiddenComments,
      rejectedStories,
      rejectedEpisodes,
      pendingCommunityPosts,
      openStory,
      startReading,
      completeChap,
      nextChapClick,
      feedImpression,
      feedReadMore
    ].find((result) => result.error)?.error;

    return {
      activeRange,
      engagement: {
        completeChap: completeChap.count ?? 0,
        feedImpression: feedImpression.count ?? 0,
        feedReadMore: feedReadMore.count ?? 0,
        nextChapClick: nextChapClick.count ?? 0,
        openStory: openStory.count ?? 0,
        startReading: startReading.count ?? 0
      },
      error: error?.message ?? null,
      platform: {
        approvedStories: approvedStories.count ?? 0,
        comments: comments.count ?? 0,
        communityPosts: communityPosts.count ?? 0,
        creators: creators.count ?? 0,
        episodes: episodes.count ?? 0,
        pendingEpisodes: pendingEpisodes.count ?? 0,
        pendingStories: pendingStories.count ?? 0,
        reports: reports.count ?? 0,
        stories: stories.count ?? 0,
        users: users.count ?? 0
      },
      safety: {
        hiddenComments: hiddenComments.count ?? 0,
        pendingCommunityPosts: pendingCommunityPosts.count ?? 0,
        rejectedEpisodes: rejectedEpisodes.count ?? 0,
        rejectedStories: rejectedStories.count ?? 0,
        reports: reports.count ?? 0
      }
    };
  } catch (error) {
    return {
      ...fallback,
      error:
        error instanceof Error ? error.message : "Khong the tai admin analytics."
    };
  }
}
