import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { createClient } from "@/lib/data/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { MilestoneViewItem } from "@/types/milestone";
import type { TopFanPerson } from "@/types/fan";
import { toMilestoneViewItems, getUserMilestones } from "@/lib/data/milestones";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";

export type DashboardStatCard = {
  label: string;
  value: number;
  icon: string;
  trend?: { direction: "up" | "down" | "neutral"; value: string };
};

export type StoryDashboardItem = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  status: string;
  reads: number;
  likes: number;
  comments: number;
  saves: number;
  episodeCount: number;
  structureType: "chaptered" | "standalone";
};

export type DashboardHighlight = {
  type: "most_read" | "most_commented" | "trending" | "recent_milestone" | "new_fan";
  title: string;
  description: string;
  storySlug?: string;
  storyId?: string;
  value?: string;
};

export type CreatorDashboardData = {
  creatorProfile: CreatorProfile | null;
  stats: DashboardStatCard[];
  stories: StoryDashboardItem[];
  highlights: DashboardHighlight[];
  milestones: MilestoneViewItem[];
  topFans: TopFanPerson[];
  hasStories: boolean;
  isOnboarded: boolean;
  error: string | null;
};

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  status: string;
  structure_type?: string | null;
};

type StoryEngagementRow = {
  story_id: string;
  reads: number;
  likes: number;
  comments: number;
  saves: number;
};

export async function getCreatorDashboard(
  creatorProfile: CreatorProfile
): Promise<CreatorDashboardData> {
  try {
    const db = await createClient();
    const creatorId = creatorProfile.id;
    const userId = creatorProfile.user_id;

    const [storiesResult, episodesCountResult, followsResult] =
      await Promise.all([
        db
          .from("stories")
          .select("id, title, slug, hook, status, structure_type")
          .eq("creator_id", creatorId)
          .in("status", ["approved", "published", "draft", "pending"])
          .order("updated_at", { ascending: false }),
        db
          .from("episodes")
          .select("id, stories!inner(creator_id)", {
            count: "exact",
            head: true
          })
          .eq("stories.creator_id", creatorId),
        db
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", creatorId)
          .eq("following_type", "creator")
      ]);

    const stories = (storiesResult.data ?? []) as unknown as StoryRow[];
    const storyIds = stories.map((s) => s.id);

    let readsThisWeek = 0;
    let newFollowersThisWeek = 0;
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const engagementByStory = new Map<string, StoryEngagementRow>();

    if (storyIds.length > 0) {
      const [engagementResult, weekReadsResult, weekFollowersResult] =
        await Promise.all([
          db.rpc("get_public_story_save_counts", {
            input_story_ids: storyIds
          }),
          db
            .from("analytics_events")
            .select("id", { count: "exact", head: true })
            .in("target_id", storyIds)
            .eq("event_name", "open_story")
            .gte("created_at", weekAgo),
          db
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("following_id", creatorId)
            .eq("following_type", "creator")
            .gte("created_at", weekAgo)
        ]);

      readsThisWeek = weekReadsResult.count ?? 0;
      newFollowersThisWeek = weekFollowersResult.count ?? 0;

      const savesData = (engagementResult.data ?? []) as Array<{
        story_id: string;
        save_count: number;
      }>;
      const savesMap = new Map(
        savesData.map((r) => [r.story_id, r.save_count])
      );

      const [reactionsResult, commentsResult] = await Promise.all([
        db
          .from("reactions")
          .select("target_id")
          .in("target_id", storyIds)
          .eq("target_type", "story"),
        db
          .from("comments")
          .select("story_id")
          .in("story_id", storyIds)
          .eq("status", "visible")
      ]);

      const reactionCounts = new Map<string, number>();
      for (const r of (reactionsResult.data ?? []) as Array<{
        target_id: string;
      }>) {
        reactionCounts.set(
          r.target_id,
          (reactionCounts.get(r.target_id) ?? 0) + 1
        );
      }

      const commentCounts = new Map<string, number>();
      for (const c of (commentsResult.data ?? []) as Array<{
        story_id: string;
      }>) {
        commentCounts.set(
          c.story_id,
          (commentCounts.get(c.story_id) ?? 0) + 1
        );
      }

      const episodeCounts = new Map<string, number>();
      if (storyIds.length > 0) {
        const { data: episodeRows } = await db
          .from("episodes")
          .select("story_id")
          .in("story_id", storyIds);
        for (const ep of (episodeRows ?? []) as Array<{
          story_id: string;
        }>) {
          episodeCounts.set(
            ep.story_id,
            (episodeCounts.get(ep.story_id) ?? 0) + 1
          );
        }
      }

      const { data: readsData } = await db
        .from("analytics_events")
        .select("target_id")
        .in("target_id", storyIds)
        .eq("event_name", "open_story");

      const readsCounts = new Map<string, number>();
      for (const r of (readsData ?? []) as Array<{ target_id: string }>) {
        readsCounts.set(
          r.target_id,
          (readsCounts.get(r.target_id) ?? 0) + 1
        );
      }

      for (const story of stories) {
        engagementByStory.set(story.id, {
          story_id: story.id,
          reads: readsCounts.get(story.id) ?? 0,
          likes: reactionCounts.get(story.id) ?? 0,
          comments: commentCounts.get(story.id) ?? 0,
          saves: savesMap.get(story.id) ?? 0
        });
      }
    }

    const totalReads = [...engagementByStory.values()].reduce(
      (sum, e) => sum + e.reads,
      0
    );
    const totalLikes = [...engagementByStory.values()].reduce(
      (sum, e) => sum + e.likes,
      0
    );
    const totalComments = [...engagementByStory.values()].reduce(
      (sum, e) => sum + e.comments,
      0
    );
    const totalEpisodes = episodesCountResult.count ?? 0;
    const totalFollowers = followsResult.count ?? 0;

    const [milestones, topFans] = await Promise.all([
      getUserMilestones({ userId, type: ["author", "story"], limit: 5 }).catch(
        () => []
      ),
      getAuthorTopFansSafe(creatorId, userId, 5)
    ]);

    const sortedByReads = [...engagementByStory.entries()].sort(
      (a, b) => b[1].reads - a[1].reads
    );
    const sortedByComments = [...engagementByStory.entries()].sort(
      (a, b) => b[1].comments - a[1].comments
    );

    const highlights: DashboardHighlight[] = [];

    const mostRead = sortedByReads[0];
    if (mostRead && mostRead[1].reads > 0) {
      const story = stories.find((s) => s.id === mostRead[0]);
      if (story) {
        highlights.push({
          type: "most_read",
          title: "Truyện đọc nhiều nhất",
          description: `${formatCompact(mostRead[1].reads)} lượt đọc`,
          storySlug: story.slug,
          storyId: story.id,
          value: formatCompact(mostRead[1].reads)
        });
      }
    }

    const mostCommented = sortedByComments[0];
    if (mostCommented && mostCommented[1].comments > 0) {
      const story = stories.find((s) => s.id === mostCommented[0]);
      if (story) {
        highlights.push({
          type: "most_commented",
          title: "Truyện gây tranh luận nhất",
          description: `${formatCompact(mostCommented[1].comments)} bình luận`,
          storySlug: story.slug,
          storyId: story.id,
          value: formatCompact(mostCommented[1].comments)
        });
      }
    }

    if (readsThisWeek > 0) {
      highlights.push({
        type: "trending",
        title: "Lượt đọc tuần này",
        description: `${formatCompact(readsThisWeek)} lượt đọc trong 7 ngày qua`,
        value: formatCompact(readsThisWeek)
      });
    }

    const milestoneViewItems = toMilestoneViewItems(milestones);
    const recentMilestone = milestoneViewItems[0];
    if (recentMilestone) {
      highlights.push({
        type: "recent_milestone",
        title: recentMilestone.title,
        description: recentMilestone.description,
        value: recentMilestone.achievedLabel
      });
    }

    if (topFans.length > 0) {
      const topFan = topFans[0];
      highlights.push({
        type: "new_fan",
        title: `Fan số 1: ${topFan.displayName}`,
        description: `${formatCompact(topFan.score)} điểm tương tác`,
        value: formatCompact(topFan.score)
      });
    }

    const storyItems: StoryDashboardItem[] = stories.map((story) => {
      const engagement = engagementByStory.get(story.id);
      return {
        id: story.id,
        title: story.title,
        slug: story.slug,
        hook: story.hook,
        status: story.status,
        reads: engagement?.reads ?? 0,
        likes: engagement?.likes ?? 0,
        comments: engagement?.comments ?? 0,
        saves: engagement?.saves ?? 0,
        episodeCount: 0,
        structureType: normalizeStoryStructureType(story.structure_type)
      };
    });

    const episodeCountMap = new Map<string, number>();
    if (storyIds.length > 0) {
      const { data: epRows } = await db
        .from("episodes")
        .select("story_id")
        .in("story_id", storyIds);
      for (const ep of (epRows ?? []) as Array<{ story_id: string }>) {
        episodeCountMap.set(
          ep.story_id,
          (episodeCountMap.get(ep.story_id) ?? 0) + 1
        );
      }
    }

    for (const item of storyItems) {
      item.episodeCount = episodeCountMap.get(item.id) ?? 0;
    }

    const stats: DashboardStatCard[] = [
      {
        label: "Lượt đọc",
        value: totalReads,
        icon: "👁️",
        trend:
          readsThisWeek > 0
            ? { direction: "up", value: `${formatCompact(readsThisWeek)} tuần này` }
            : undefined
      },
      {
        label: "Follower",
        value: totalFollowers,
        icon: "❤️",
        trend:
          newFollowersThisWeek > 0
            ? {
                direction: "up",
                value: `+${formatCompact(newFollowersThisWeek)} tuần này`
              }
            : undefined
      },
      { label: "Lượt thích", value: totalLikes, icon: "⭐" },
      { label: "Bình luận", value: totalComments, icon: "💬" },
      { label: "Truyện", value: stories.length, icon: "📚" },
      { label: "Chap", value: totalEpisodes, icon: "📝" }
    ];

    return {
      creatorProfile,
      stats,
      stories: storyItems,
      highlights,
      milestones: milestoneViewItems,
      topFans,
      hasStories: stories.length > 0,
      isOnboarded: stories.length > 0,
      error: null
    };
  } catch (error) {
    return {
      creatorProfile,
      stats: [],
      stories: [],
      highlights: [],
      milestones: [],
      topFans: [],
      hasStories: false,
      isOnboarded: false,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu dashboard."
    };
  }
}

async function getAuthorTopFansSafe(
  authorId: string,
  userId: string,
  limit: number
): Promise<TopFanPerson[]> {
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("get_author_top_fans", {
      input_author_id: authorId,
      input_user_id: userId,
      input_limit: limit
    });

    if (error || !data) return [];

    type TopFanRow = {
      user_id: string;
      rank: number;
      score: number;
      display_name: string;
      username: string | null;
      avatar_url: string | null;
      is_current_user: boolean;
    };

    return (data as TopFanRow[]).map((row: TopFanRow) => ({
      id: row.user_id,
      rank: Number(row.rank ?? 0),
      score: Number(row.score ?? 0),
      displayName: row.display_name ?? row.username ?? "ChapMee reader",
      handle: row.username ? `@${row.username}` : null,
      avatarUrl: profileAvatarUrlFromRow({ id: row.user_id, avatar_url: row.avatar_url }),
      isCurrentUser: Boolean(row.is_current_user)
    }));
  } catch {
    return [];
  }
}
