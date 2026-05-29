import { createClient } from "@/lib/supabase/server";
import { studioPath } from "@/lib/studio/constants";
import { analyticsEvents } from "@/lib/analytics/events";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getAuthorNeedsActionQualityCount } from "@/lib/content-quality/get-author-content-health";
import { getCreatorStatusSafe } from "@/lib/moderation/get-creator-status";
import type {
  CreatorDashboardAlert,
  CreatorDashboardContinueItem,
  CreatorStudioDashboardData
} from "@/types/creator";

const READ_EVENT_NAMES = [
  analyticsEvents.openStory,
  analyticsEvents.storyViewed,
  analyticsEvents.chapterOpened
] as const;

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  cover_url: string | null;
  short_description: string | null;
  long_description: string | null;
  updated_at: string;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  title: string;
  episode_number: number;
  status: CreatorDashboardContinueItem["status"];
  updated_at: string;
  stories:
    | { id: string; title: string; creator_id: string }
    | { id: string; title: string; creator_id: string }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function episodeStatusLabel(status: CreatorDashboardContinueItem["status"]) {
  switch (status) {
    case "pending":
      return "Chờ duyệt";
    case "rejected":
      return "Cần sửa";
    default:
      return "Nháp";
  }
}

function getWeekAgoIso() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function getCreatorStudioDashboard(
  creatorProfile: CreatorProfile
): Promise<CreatorStudioDashboardData> {
  const empty: CreatorStudioDashboardData = {
    alerts: [],
    continueWriting: [],
    creatorProfile,
    defaultStoryId: null,
    defaultStorySlug: null,
    error: null,
    hasStories: false,
    qualityNeedsActionCount: 0,
    overview: {
      activeStories: 0,
      draftChapters: 0,
      reads7d: 0,
      scheduledUpcoming: 0
    },
    performance7d: {
      comments: 0,
      newFollowers: 0,
      reads: 0,
      saves: 0
    },
    scheduledChapters: [],
    writeChapterHref: studioPath("/stories/new")
  };

  try {
    const supabase = await createClient();
    const weekAgo = getWeekAgoIso();
    const creatorId = creatorProfile.id;

    const [storiesResult, moderationStatus, qualityNeedsActionCount] =
      await Promise.all([
      supabase
        .from("stories")
        .select(
          "id, title, slug, status, cover_url, short_description, long_description, updated_at"
        )
        .eq("creator_id", creatorId)
        .order("updated_at", { ascending: false }),
        getCreatorStatusSafe(creatorProfile.user_id, creatorId),
        getAuthorNeedsActionQualityCount(creatorProfile)
      ]);

    const stories = (storiesResult.data ?? []) as StoryRow[];
    const storyIds = stories.map((story) => story.id);
    const hasStories = stories.length > 0;
    const defaultStoryId = stories[0]?.id ?? null;
    const defaultStorySlug = stories[0]?.slug ?? null;

    const [
      draftEpisodeRowsResult,
      recentDraftEpisodesResult,
      draftCountResult,
      rejectedCountResult
    ] = await Promise.all([
      storyIds.length > 0
        ? supabase
            .from("episodes")
            .select("story_id")
            .eq("status", "draft")
            .in("story_id", storyIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("episodes")
        .select(
          "id, story_id, title, episode_number, status, updated_at, stories!inner(id, title, creator_id)"
        )
        .eq("stories.creator_id", creatorId)
        .in("status", ["draft", "pending", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(3),
      supabase
        .from("episodes")
        .select("id, stories!inner(creator_id)", { count: "exact", head: true })
        .eq("stories.creator_id", creatorId)
        .eq("status", "draft"),
      supabase
        .from("episodes")
        .select("id, stories!inner(creator_id)", { count: "exact", head: true })
        .eq("stories.creator_id", creatorId)
        .eq("status", "rejected")
    ]);

    const storiesWithDraftEpisodes = new Set(
      (draftEpisodeRowsResult.data ?? []).map(
        (row) => (row as { story_id: string }).story_id
      )
    );

    const activeStories = stories.filter(
      (story) =>
        story.status === "draft" ||
        story.status === "pending" ||
        storiesWithDraftEpisodes.has(story.id)
    ).length;

    const draftChapters = draftCountResult.count ?? 0;

    const { data: scheduledRows, count: scheduledUpcomingCount } = await supabase
      .from("scheduled_publications")
      .select("id, scheduled_at, story_id, target_id, target_type, stories(title)", {
        count: "exact"
      })
      .eq("creator_id", creatorProfile.user_id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(5);

    const scheduledUpcoming = scheduledUpcomingCount ?? 0;
    const chapterScheduleIds = (scheduledRows ?? [])
      .filter((row) => row.target_type === "chapter")
      .map((row) => row.target_id as string);

    const episodeMetaById = new Map<
      string,
      { title: string; episode_number: number }
    >();

    if (chapterScheduleIds.length > 0) {
      const { data: episodes } = await supabase
        .from("episodes")
        .select("id, title, episode_number")
        .in("id", chapterScheduleIds);

      for (const episode of episodes ?? []) {
        episodeMetaById.set(episode.id as string, {
          episode_number: episode.episode_number as number,
          title: episode.title as string
        });
      }
    }

    const scheduledChapters: CreatorStudioDashboardData["scheduledChapters"] = (
      scheduledRows ?? []
    )
      .filter((row) => row.target_type === "chapter")
      .map((row) => {
        const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
        const episode = episodeMetaById.get(row.target_id as string);

        return {
          episodeId: row.target_id as string,
          episodeNumber: episode?.episode_number ?? 0,
          episodeTitle: episode?.title ?? "Chương",
          publishAt: row.scheduled_at as string,
          statusLabel: "Đã lên lịch",
          storyId: row.story_id as string,
          storyTitle: (story?.title as string) ?? "Truyện"
        };
      });

    let reads7d = 0;
    let saves7d = 0;
    let comments7d = 0;
    let newFollowers7d = 0;

    if (storyIds.length > 0) {
      const [readsResult, savesResult, commentsResult, followersResult] =
        await Promise.all([
          supabase
            .from("analytics_events")
            .select("id", { count: "exact", head: true })
            .in("target_id", storyIds)
            .in("event_name", [...READ_EVENT_NAMES])
            .gte("created_at", weekAgo),
          supabase
            .from("bookshelf_items")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .gte("created_at", weekAgo),
          supabase
            .from("comments")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .eq("status", "visible")
            .gte("created_at", weekAgo),
          supabase
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", creatorId)
            .gte("created_at", weekAgo)
        ]);

      reads7d = readsResult.count ?? 0;
      saves7d = savesResult.count ?? 0;
      comments7d = commentsResult.count ?? 0;
      newFollowers7d = followersResult.count ?? 0;
    }

    const continueWriting: CreatorDashboardContinueItem[] = (
      (recentDraftEpisodesResult.data ?? []) as EpisodeRow[]
    ).map((episode) => {
      const story = firstRelation(episode.stories);
      const status = episode.status;

      return {
        editHref: studioPath(
          `/stories/${episode.story_id}/chapters/${episode.id}/edit`
        ),
        episodeId: episode.id,
        episodeNumber: episode.episode_number,
        episodeTitle: episode.title,
        status,
        statusLabel: episodeStatusLabel(status),
        storyId: episode.story_id,
        storyTitle: story?.title ?? "Truyện",
        updatedAt: episode.updated_at
      };
    });

    const writeChapterHref = defaultStoryId
      ? studioPath(`/stories/${defaultStoryId}/chapters/new`)
      : studioPath("/stories/new");

    const alerts: CreatorDashboardAlert[] = [];

    if (storyIds.length > 0) {
      const { data: currentImages } = await supabase
        .from("story_images")
        .select("story_id")
        .in("story_id", storyIds)
        .eq("is_current", true);

      const storiesWithImage = new Set(
        (currentImages ?? []).map((row) => (row as { story_id: string }).story_id)
      );

      for (const story of stories) {
        const hasCover = Boolean(story.cover_url) || storiesWithImage.has(story.id);
        const hasDescription = Boolean(
          story.short_description?.trim() || story.long_description?.trim()
        );

        if (!hasCover) {
          alerts.push({
            description: `「${story.title}」chưa có ảnh bìa.`,
            href: studioPath(`/stories/${story.id}/edit`),
            id: `missing-cover-${story.id}`,
            severity: "warning",
            title: "Thiếu ảnh bìa",
            type: "missing_cover"
          });
        }

        if (!hasDescription) {
          alerts.push({
            description: `Thêm mô tả ngắn để độc giả dễ tìm thấy truyện.`,
            href: studioPath(`/stories/${story.id}/edit`),
            id: `missing-desc-${story.id}`,
            severity: "info",
            title: `「${story.title}」thiếu mô tả`,
            type: "missing_description"
          });
        }
      }
    }

    if (draftChapters > 0) {
      alerts.push({
        description:
          "Lên lịch đăng sẽ có sau khi bật tính năng lịch — hiện bạn có thể gửi duyệt thủ công.",
        href: `${studioPath()}#lich-dang`,
        id: "draft-no-schedule",
        severity: "info",
        title: `${draftChapters} chương nháp chưa có lịch đăng`,
        type: "draft_no_schedule"
      });
    }

    if (comments7d > 0) {
      alerts.push({
        description: `${comments7d} bình luận mới trong 7 ngày qua trên truyện của bạn.`,
        href: studioPath("/stories"),
        id: "new-comments",
        severity: "info",
        title: "Bình luận mới cần xem",
        type: "new_comments"
      });
    }

    if (moderationStatus.pendingReviewStories > 0) {
      alerts.push({
        description: `${moderationStatus.pendingReviewStories} truyện đang chờ đội duyệt.`,
        href: studioPath("/stories?status=pending"),
        id: "pending-review",
        severity: "info",
        title: "Truyện chờ duyệt",
        type: "pending_review"
      });
    }

    if (!moderationStatus.canPublishStories) {
      alerts.push({
        description: "Tài khoản đang bị hạn chế đăng nội dung.",
        href: studioPath("/status"),
        id: "publish-block",
        severity: "warning",
        title: "Không thể đăng truyện",
        type: "moderation"
      });
    }

    if (moderationStatus.recentViolations.length > 0) {
      alerts.push({
        description: "Xem chi tiết vi phạm và hạn chế trên trang trạng thái.",
        href: studioPath("/status"),
        id: "recent-violations",
        severity: "warning",
        title: "Có vi phạm cần lưu ý",
        type: "moderation"
      });
    }

    const rejectedCount = rejectedCountResult.count ?? 0;

    if (rejectedCount > 0) {
      const rejectedEditHref = continueWriting.find(
        (item) => item.status === "rejected"
      )?.editHref;

      alerts.push({
        description: "Chỉnh sửa và gửi lại theo góp ý từ đội kiểm duyệt.",
        href: rejectedEditHref ?? studioPath("/stories"),
        id: "rejected-chapters",
        severity: "warning",
        title: `${rejectedCount} chương bị từ chối`,
        type: "rejected_chapter"
      });
    }

    if (qualityNeedsActionCount > 0) {
      alerts.push({
        description: `${qualityNeedsActionCount} truyện cần xử lý chất lượng — xem lý do và gửi xét duyệt lại.`,
        href: studioPath("/content-health?tab=needs_action"),
        id: "content-quality",
        severity: "warning",
        title: "Chất lượng nội dung",
        type: "content_quality"
      });
    }

    const errors = [
      storiesResult.error,
      recentDraftEpisodesResult.error,
      draftCountResult.error
    ].filter(Boolean);

    return {
      alerts: alerts.slice(0, 8),
      continueWriting,
      creatorProfile,
      defaultStoryId,
      defaultStorySlug,
      error: errors[0]?.message ?? null,
      hasStories,
      qualityNeedsActionCount,
      overview: {
        activeStories,
        draftChapters,
        reads7d,
        scheduledUpcoming
      },
      performance7d: {
        comments: comments7d,
        newFollowers: newFollowers7d,
        reads: reads7d,
        saves: saves7d
      },
      scheduledChapters,
      writeChapterHref
    };
  } catch (error) {
    return {
      ...empty,
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải tổng quan Studio."
    };
  }
}
