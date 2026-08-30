import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getPublicStoryEarlyFanStats } from "@/lib/data/early-fans";
import { syncAuthorMilestones } from "@/lib/data/milestones";
import { syncStoryReadMilestones } from "@/lib/data/milestones";
import { syncAuthorBadges } from "@/lib/data/badges";

export type CreatorDashboardStory = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "pending" | "approved" | "rejected" | "published" | "archived";
  updated_at: string;
  published_at: string | null;
};

export type CreatorDashboardStats = {
  totalStories: number;
  totalEpisodes: number;
  pendingStories: number;
  pendingEpisodes: number;
  reads: number;
  saves: number;
  followers: number;
  comments: number;
};

export type CreatorDashboardData = {
  creatorProfile: CreatorProfile;
  stats: CreatorDashboardStats;
  stories: CreatorDashboardStory[];
  error: string | null;
};

export async function getCreatorDashboard(
  creatorProfile: CreatorProfile
): Promise<CreatorDashboardData> {
  try {
    const db = await createClient();

    const [
      storiesResult,
      totalStoriesResult,
      pendingStoriesResult,
      totalEpisodesResult,
      pendingEpisodesResult,
      followersResult,
      metricsResult
    ] = await Promise.all([
      db
        .from("stories")
        .select("id, title, slug, status, updated_at, published_at")
        .eq("creator_id", creatorProfile.id)
        .order("updated_at", { ascending: false })
        .limit(5),
      db
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorProfile.id),
      db
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorProfile.id)
        .eq("status", "pending"),
      db
        .from("episodes")
        .select("id, stories!inner(creator_id)", { count: "exact", head: true })
        .eq("stories.creator_id", creatorProfile.id),
      db
        .from("episodes")
        .select("id, stories!inner(creator_id)", { count: "exact", head: true })
        .eq("stories.creator_id", creatorProfile.id)
        .eq("status", "pending"),
      db
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", creatorProfile.id),
      db.rpc("get_public_creator_profile_metrics", {
        input_creator_id: creatorProfile.id
      })
    ]);

    const stories = (storiesResult.data ?? []) as CreatorDashboardStory[];
    const storyIds = stories.map((story) => story.id);

    const [savesResult, commentsResult] = storyIds.length
      ? await Promise.all([
          db
            .from("bookshelf_items")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds),
          db
            .from("comments")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .eq("status", "visible")
        ])
      : [
          { count: 0, error: null },
          { count: 0, error: null }
        ];

    const metricsError =
      metricsResult.error && !isMissingSchemaError(metricsResult.error)
        ? typeof metricsResult.error === "string"
          ? metricsResult.error
          : metricsResult.error.message
        : null;

    const errors = [
      storiesResult.error,
      totalStoriesResult.error,
      pendingStoriesResult.error,
      totalEpisodesResult.error,
      pendingEpisodesResult.error,
      followersResult.error,
      metricsError,
      savesResult.error,
      commentsResult.error
    ].filter(Boolean);

    const metrics = Array.isArray(metricsResult.data)
      ? metricsResult.data[0]
      : metricsResult.data;

    await syncAuthorMilestones({
      creatorProfileId: creatorProfile.id,
      followerCount: Number(metrics?.follower_count ?? followersResult.count ?? 0),
      storyCount: Number(metrics?.story_count ?? totalStoriesResult.count ?? stories.length),
      userId: creatorProfile.user_id
    });

    const storyStats = await Promise.all(
      storyIds.map((storyId) => getPublicStoryEarlyFanStats(storyId))
    );

    await Promise.all(
      storyStats
        .filter(
          (story): story is NonNullable<typeof story> =>
            Boolean(story?.storyId && story?.readCount != null)
        )
        .map((story) =>
          syncStoryReadMilestones({
            readCount: Number(story.readCount ?? 0),
            storyId: story.storyId,
            storyTitle: story.storyTitle ?? "Truyện",
            userId: creatorProfile.user_id
          })
        )
    );

    await syncAuthorBadges({
      userId: creatorProfile.user_id,
      createdAt: creatorProfile.created_at,
      followerCount: Number(metrics?.follower_count ?? followersResult.count ?? 0),
      storiesCount: Number(metrics?.story_count ?? totalStoriesResult.count ?? stories.length),
      totalReads: Number(metrics?.total_read_count ?? 0),
      storyPublishedAts: stories.map((story) => story.published_at)
    });

    return {
      creatorProfile,
      error:
        typeof errors[0] === "string"
          ? errors[0]
          : errors[0] && "message" in errors[0]
            ? String(errors[0].message)
            : null,
      stories,
      stats: {
        totalStories: totalStoriesResult.count ?? stories.length,
        totalEpisodes: totalEpisodesResult.count ?? 0,
        pendingStories: pendingStoriesResult.count ?? 0,
        pendingEpisodes: pendingEpisodesResult.count ?? 0,
        reads: Number(metrics?.total_read_count ?? 0),
        saves: savesResult.count ?? 0,
        followers: Number(metrics?.follower_count ?? followersResult.count ?? 0),
        comments: commentsResult.count ?? 0
      }
    };
  } catch (error) {
    return {
      creatorProfile,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải tổng quan Studio.",
      stories: [],
      stats: {
        totalStories: 0,
        totalEpisodes: 0,
        pendingStories: 0,
        pendingEpisodes: 0,
        reads: 0,
        saves: 0,
        followers: 0,
        comments: 0
      }
    };
  }
}
