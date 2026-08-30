import { createClient } from "@/lib/data/server";
import { studioPath } from "@/lib/studio/constants";
import { analyticsEvents } from "@/lib/analytics/events";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import { getAuthorNeedsActionQualityCount } from "@/lib/content-quality/get-author-content-health";
import { getCreatorStatusSafe } from "@/lib/moderation/get-creator-status";
import { isCreatorMonetizationAllowed } from "@/lib/creator-access";
import { buildStudioMonetizationConfigView } from "@/lib/studio/monetization-config";
import { getOrCreateCreatorMonetizationProfile } from "@/lib/data/creator-monetization";
import { getUserVerificationSummary } from "@/lib/verification/get-user-verification";
import { getOrCreateCreatorWallet } from "@/lib/wallets/creator-wallet";
import {
  getStudioWriteActionLabel,
  getStudioWriteToolLabel,
  normalizeStoryStructureType
} from "@/lib/stories/story-structure";
import { getStoryUrl } from "@/lib/urls/paths";
import type {
  CreatorDashboardAlert,
  CreatorDashboardContinueItem,
  CreatorStudioDashboardData,
  StudioAccountStatus,
  StudioAttentionGroup,
  StudioAttentionPreviewItem,
  StudioHeroSummaryLine,
  StudioPerformanceSnapshot,
  StudioQuickStat,
  StudioTodayAction
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
  public_code?: string | null;
  visibility?: string | null;
  status: string;
  cover_url: string | null;
  short_description: string | null;
  long_description: string | null;
  updated_at: string;
  structure_type?: string | null;
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

function getTwoWeeksAgoIso() {
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
}

function calcDeltaPercent(current: number, previous: number): number | null {
  if (current === 0 && previous === 0) {
    return null;
  }

  if (previous === 0) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function countEventsByTarget(
  rows: Array<{ target_id: string | null }> | null | undefined
) {
  const counts = new Map<string, number>();

  for (const row of rows ?? []) {
    if (!row.target_id) {
      continue;
    }

    counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
  }

  return counts;
}

function buildAccountStatus(input: {
  creatorProfile: CreatorProfile;
  canPublishStories: boolean;
  monetizationEnabled: boolean;
  monetizationStatus: string | null;
  availableRevenueVnd: number | null;
  verificationSummary: Awaited<ReturnType<typeof getUserVerificationSummary>>;
  qualityNeedsActionCount: number;
}): StudioAccountStatus {
  let statusLabel: StudioAccountStatus["statusLabel"] = "active";
  let statusDisplay = "Hoạt động";

  if (input.creatorProfile.status === "suspended") {
    statusLabel = "suspended";
    statusDisplay = "Tạm ngưng";
  } else if (!input.canPublishStories) {
    statusLabel = "limited";
    statusDisplay = "Hạn chế";
  } else if (input.monetizationStatus === "pending_review") {
    statusLabel = "pending";
    statusDisplay = "Chờ duyệt";
  }

  let verificationLabel: StudioAccountStatus["verificationLabel"] = "unverified";
  let verificationDisplay = "Chua xác minh";

  if (input.verificationSummary.publicBadge?.type === "blue_tick") {
    verificationLabel = "blue_tick";
    verificationDisplay = "Tích xanh";
  } else if (input.verificationSummary.publicBadge) {
    verificationLabel = "verified";
    verificationDisplay = "Đã xác minh";
  } else if (input.verificationSummary.latestPending) {
    verificationLabel = "pending";
    verificationDisplay = "Chờ xác minh";
  }

  let monetizationDisplay: string | null = null;

  if (input.monetizationEnabled) {
    monetizationDisplay = "Kiếm tiền đang bật";
  } else if (input.monetizationStatus === "pending_review") {
    monetizationDisplay = "Kiếm tiền chờ duyệt";
  } else if (input.monetizationStatus === "suspended") {
    monetizationDisplay = "Kiếm tiền tạm dừng";
  }

  return {
    availableRevenueVnd: input.availableRevenueVnd,
    monetizationDisplay,
    monetizationEnabled: input.monetizationEnabled,
    qualityDisplay:
      input.qualityNeedsActionCount > 0 ? "Có cảnh báo" : "Bình thường",
    qualityHasWarning: input.qualityNeedsActionCount > 0,
    statusDisplay,
    statusLabel,
    verificationDisplay,
    verificationLabel
  };
}

function buildAttentionGroups(input: {
  missingCoverStories: StudioAttentionPreviewItem[];
  missingDescriptionStories: StudioAttentionPreviewItem[];
  draftChapters: number;
  comments7d: number;
  pendingReviewStories: number;
  canPublishStories: boolean;
  recentViolationsCount: number;
  rejectedCount: number;
  rejectedEditHref: string | null;
  qualityNeedsActionCount: number;
}): StudioAttentionGroup[] {
  const groups: StudioAttentionGroup[] = [];

  if (input.missingCoverStories.length > 0) {
    groups.push({
      count: input.missingCoverStories.length,
      description: "Bổ sung ảnh bìa giúp truyện nổi bật hơn trên ChapMee.",
      href: studioPath("/stories"),
      id: "missing-cover-group",
      previewItems: input.missingCoverStories.slice(0, 3),
      severity: "warning",
      title: `${input.missingCoverStories.length} truyện thiếu ảnh bìa`,
      type: "missing_cover"
    });
  }

  if (input.missingDescriptionStories.length > 0) {
    groups.push({
      count: input.missingDescriptionStories.length,
      description: "Thêm mô tả ngắn để độc giả dễ tìm thấy truyện.",
      href: studioPath("/stories"),
      id: "missing-desc-group",
      previewItems: input.missingDescriptionStories.slice(0, 3),
      severity: "info",
      title: `${input.missingDescriptionStories.length} truyện thiếu mô tả`,
      type: "missing_description"
    });
  }

  if (input.rejectedCount > 0) {
    groups.push({
      count: input.rejectedCount,
      description: "Chỉnh sửa và gửi lại theo góp ý từ đội kiểm duyệt.",
      href: input.rejectedEditHref ?? studioPath("/stories"),
      id: "rejected-chapters",
      previewItems: [],
      severity: "warning",
      title: `${input.rejectedCount} chương bị trả về`,
      type: "rejected_chapter"
    });
  }

  if (input.qualityNeedsActionCount > 0) {
    groups.push({
      count: input.qualityNeedsActionCount,
      description: "Xem lý do và gửi xét duyệt lại.",
      href: studioPath("/content-health?tab=needs_action"),
      id: "content-quality",
      previewItems: [],
      severity: "warning",
      title: `${input.qualityNeedsActionCount} nội dung bị cảnh báo chất lượng`,
      type: "content_quality"
    });
  }

  if (input.comments7d > 0) {
    groups.push({
      count: input.comments7d,
      description: "Phản hồi bình luận giúp giữ chân độc giả.",
      href: studioPath("/comments"),
      id: "new-comments",
      previewItems: [],
      severity: "info",
      title: `${input.comments7d} bình luận cần phản hồi`,
      type: "new_comments"
    });
  }

  if (input.draftChapters > 0) {
    groups.push({
      count: input.draftChapters,
      description: "Gửi duyệt hoặc lên lịch đăng từ editor chương.",
      href: studioPath("/drafts"),
      id: "draft-chapters",
      previewItems: [],
      severity: "info",
      title: `${input.draftChapters} chương nháp chưa đăng`,
      type: "draft_no_schedule"
    });
  }

  if (input.pendingReviewStories > 0) {
    groups.push({
      count: input.pendingReviewStories,
      description: "Theo dõi tiến độ duyệt trên trang Truyện.",
      href: studioPath("/stories?status=pending"),
      id: "pending-review",
      previewItems: [],
      severity: "info",
      title: `${input.pendingReviewStories} truyện chờ duyệt`,
      type: "pending_review"
    });
  }

  if (!input.canPublishStories) {
    groups.push({
      count: 1,
      description: "Tài khoản đang bị hạn chế đăng nội dung.",
      href: studioPath("/status"),
      id: "publish-block",
      previewItems: [],
      severity: "error",
      title: "Không thể đăng truyện",
      type: "moderation"
    });
  }

  if (input.recentViolationsCount > 0) {
    groups.push({
      count: input.recentViolationsCount,
      description: "Xem chi tiết vi phạm và hạn chế trên trang trạng thái.",
      href: studioPath("/status"),
      id: "recent-violations",
      previewItems: [],
      severity: "warning",
      title: "Có vi phạm cần lưu ý",
      type: "moderation"
    });
  }

  return groups;
}

function priorityMeta(priority: StudioTodayAction["priority"]) {
  switch (priority) {
    case "high":
      return { priority, priorityLabel: "Cao" };
    case "medium":
      return { priority, priorityLabel: "Nên làm" };
    default:
      return { priority, priorityLabel: "Gợi ý" };
  }
}

function buildTodayActions(input: {
  continueWriting: CreatorDashboardContinueItem[];
  missingCoverCount: number;
  missingDescriptionCount: number;
  qualityNeedsActionCount: number;
  rejectedCount: number;
  comments7d: number;
  scheduledUpcoming: number;
  hasStories: boolean;
  draftChapters: number;
  calendarHref: string;
  contentHealthHref: string;
}): StudioTodayAction[] {
  const actions: StudioTodayAction[] = [];

  if (input.qualityNeedsActionCount > 0) {
    actions.push({
      ...priorityMeta("high"),
      ctaLabel: "Xem cảnh báo",
      description: `${input.qualityNeedsActionCount} nội dung cần xử lý ngay.`,
      href: input.contentHealthHref,
      id: "quality-review",
      title: "Duyệt lại nội dung bị cảnh báo"
    });
  }

  if (input.rejectedCount > 0) {
    actions.push({
      ...priorityMeta("high"),
      ctaLabel: "Chỉnh sửa",
      description: `${input.rejectedCount} chương bị trả về, cần sửa và gửi lại.`,
      href: studioPath("/drafts"),
      id: "rejected-chapters",
      title: "Chương bị trả về cần sửa"
    });
  }

  if (input.missingCoverCount > 0) {
    actions.push({
      ...priorityMeta("high"),
      ctaLabel: "Bổ sung ảnh",
      description: `${input.missingCoverCount} truyện chưa có ảnh bìa.`,
      href: studioPath("/stories"),
      id: "fix-covers",
      title: "Hoàn thiện truyện thiếu ảnh bìa"
    });
  }

  if (input.comments7d > 0) {
    actions.push({
      ...priorityMeta("medium"),
      ctaLabel: "Trả lời bình luận",
      description: `${input.comments7d} bình luận mới trong 7 ngày.`,
      href: studioPath("/comments"),
      id: "reply-comments",
      title: "Phản hồi bình luận mới"
    });
  }

  const latestDraft = input.continueWriting[0];
  if (latestDraft) {
    actions.push({
      ...priorityMeta("medium"),
      ctaLabel: "Viết tiếp",
      description: `${latestDraft.storyTitle} · Ch.${latestDraft.episodeNumber}`,
      href: latestDraft.editHref,
      id: "continue-draft",
      title: "Viết tiếp bản nháp gần nhất"
    });
  } else if (input.hasStories && input.draftChapters === 0) {
    actions.push({
      ...priorityMeta("low"),
      ctaLabel: "Viết chương",
      description: "Bạn chưa có bản nháp nào đang soạn.",
      href: studioPath("/stories"),
      id: "start-chapter",
      title: "Bắt đầu chương mới"
    });
  }

  if (input.scheduledUpcoming === 0 && input.hasStories) {
    actions.push({
      ...priorityMeta("low"),
      ctaLabel: "Lên lịch chương",
      description: "Chưa có lịch đăng sắp tới.",
      href: input.calendarHref,
      id: "schedule-chapter",
      title: "Lên lịch đăng chương"
    });
  }

  if (input.missingDescriptionCount > 0 && actions.length < 3) {
    actions.push({
      ...priorityMeta("medium"),
      ctaLabel: "Bổ sung mô tả",
      description: `${input.missingDescriptionCount} truyện thiếu mô tả.`,
      href: studioPath("/stories"),
      id: "fix-descriptions",
      title: "Hoàn thiện mô tả truyện"
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3);
}

function buildHeroSummary(input: {
  pendingEpisodes: number;
  missingCoverCount: number;
  comments7d: number;
  scheduledUpcoming: number;
}): StudioHeroSummaryLine[] {
  const lines: StudioHeroSummaryLine[] = [];

  if (input.pendingEpisodes > 0) {
    lines.push({
      href: studioPath("/stories"),
      id: "pending-episodes",
      label: "Chương chờ duyệt",
      value: input.pendingEpisodes
    });
  }

  if (input.missingCoverCount > 0) {
    lines.push({
      href: studioPath("/stories"),
      id: "missing-covers",
      label: "Truyện thiếu ảnh bìa",
      value: input.missingCoverCount
    });
  }

  if (input.comments7d > 0) {
    lines.push({
      href: studioPath("/comments"),
      id: "new-comments",
      label: "Bình luận mới",
      value: input.comments7d
    });
  }

  if (input.scheduledUpcoming > 0) {
    lines.push({
      href: studioPath("/calendar"),
      id: "scheduled",
      label: "Lịch đăng sắp tới",
      value: input.scheduledUpcoming
    });
  }

  return lines.slice(0, 4);
}

function buildQuickStats(input: {
  reads7d: number;
  readsPrev7d: number;
  saves7d: number;
  savesPrev7d: number;
  comments7d: number;
  commentsPrev7d: number;
  newFollowers7d: number;
  newFollowersPrev7d: number;
  draftChapters: number;
  scheduledUpcoming: number;
  availableRevenueVnd: number | null;
  monetizationEnabled: boolean;
}): StudioQuickStat[] {
  const stats: StudioQuickStat[] = [
    {
      deltaPercent: calcDeltaPercent(input.reads7d, input.readsPrev7d),
      format: "number",
      hint: "7 ngày qua",
      href: studioPath("/analytics"),
      id: "reads",
      label: "Lượt đọc 7 ngày",
      value: input.reads7d
    },
    {
      deltaPercent: calcDeltaPercent(input.saves7d, input.savesPrev7d),
      format: "number",
      hint: "7 ngày qua",
      href: studioPath("/analytics"),
      id: "saves",
      label: "Lượt lưu",
      value: input.saves7d
    },
    {
      deltaPercent: calcDeltaPercent(input.comments7d, input.commentsPrev7d),
      format: "number",
      hint: "7 ngày qua",
      href: studioPath("/comments"),
      id: "comments",
      label: "Bình luận mới",
      value: input.comments7d
    },
    {
      deltaPercent: calcDeltaPercent(input.newFollowers7d, input.newFollowersPrev7d),
      format: "number",
      hint: "7 ngày qua",
      id: "followers",
      label: "Người theo dõi mới",
      value: input.newFollowers7d
    },
    {
      deltaPercent: null,
      format: "number",
      hint: "Chưa gửi duyệt",
      href: studioPath("/drafts"),
      id: "drafts",
      label: "Chương nháp",
      value: input.draftChapters
    },
    {
      deltaPercent: null,
      format: "number",
      hint: "Sắp đăng",
      href: studioPath("/calendar"),
      id: "scheduled",
      label: "Lịch sắp đăng",
      value: input.scheduledUpcoming
    }
  ];

  if (input.monetizationEnabled && input.availableRevenueVnd !== null) {
    stats.push({
      deltaPercent: null,
      format: "currency",
      hint: "Khả dụng",
      href: studioPath("/finance"),
      id: "revenue",
      label: "Doanh thu khả dụng",
      value: input.availableRevenueVnd
    });
  }

  return stats;
}

function buildLegacyAlerts(groups: StudioAttentionGroup[]): CreatorDashboardAlert[] {
  return groups.map((group) => ({
    description: group.description,
    href: group.href,
    id: group.id,
    severity: group.severity === "error" ? "warning" : group.severity,
    title: group.title,
    type: group.type === "grouped" ? "missing_cover" : group.type
  }));
}

export async function getCreatorStudioDashboard(
  creatorProfile: CreatorProfile
): Promise<CreatorStudioDashboardData> {
  const empty: CreatorStudioDashboardData = {
    accountStatus: {
      availableRevenueVnd: null,
      monetizationDisplay: null,
      monetizationEnabled: false,
      qualityDisplay: "Bình thường",
      qualityHasWarning: false,
      statusDisplay: "Hoạt động",
      statusLabel: "active",
      verificationDisplay: "Chua xác minh",
      verificationLabel: "unverified"
    },
    alerts: [],
    attentionGroups: [],
    continueWriting: [],
    creatorProfile,
    defaultStoryId: null,
    defaultStorySlug: null,
    error: null,
    hasStories: false,
    pendingEpisodes: 0,
    pendingStories: 0,
    performanceSnapshot: {
      comments: 0,
      newFollowers: 0,
      reelsViews: null,
      topChapters: [],
      topStories: []
    },
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
    quickStats: [],
    heroSummary: [],
    scheduledChapters: [],
    todayActions: [],
    writeChapterHref: studioPath("/stories/new"),
    writeActionLabel: "Viết chương mới",
    writeToolLabel: "Viết chương"
  };

  try {
    const db = await createClient();
    const weekAgo = getWeekAgoIso();
    const twoWeeksAgo = getTwoWeeksAgoIso();
    const creatorId = creatorProfile.id;
    const profileUserId = creatorProfile.user_id;

    const [
      storiesResult,
      moderationStatus,
      qualityNeedsActionCount,
      verificationSummary,
      monetizationConfig
    ] = await Promise.all([
      db
        .from("stories")
        .select(
          "id, title, slug, public_code, visibility, status, cover_url, short_description, long_description, updated_at, structure_type"
        )
        .eq("creator_id", creatorId)
        .order("updated_at", { ascending: false }),
      getCreatorStatusSafe(profileUserId, creatorId),
      getAuthorNeedsActionQualityCount(creatorProfile),
      getUserVerificationSummary(profileUserId),
      buildStudioMonetizationConfigView({ includePrivate: true })
    ]);

    const monetizationConfigEnabled =
      monetizationConfig.ecosystemEnabled &&
      monetizationConfig.creatorMonetizationEnabled;

    const [monetizationProfileResult, walletResult] = await Promise.all([
      monetizationConfigEnabled
        ? getOrCreateCreatorMonetizationProfile(profileUserId)
        : Promise.resolve({ data: null, error: null }),
      monetizationConfigEnabled
        ? getOrCreateCreatorWallet(profileUserId)
        : Promise.resolve({ data: null, error: null })
    ]);

    const monetizationProfile = monetizationProfileResult.data;
    const monetizationEnabled = monetizationConfigEnabled
      ? await isCreatorMonetizationAllowed(profileUserId)
      : false;
    const availableRevenueVnd = walletResult.data?.available_revenue_vnd ?? null;

    const stories = (storiesResult.data ?? []) as StoryRow[];
    const storyIds = stories.map((story) => story.id);
    const hasStories = stories.length > 0;
    const defaultStoryId = stories[0]?.id ?? null;
    const defaultStorySlug = stories[0]?.slug ?? null;

    const [
      draftEpisodeRowsResult,
      recentDraftEpisodesResult,
      draftCountResult,
      rejectedCountResult,
      pendingEpisodeCountResult
    ] = await Promise.all([
      storyIds.length > 0
        ? db
            .from("episodes")
            .select("story_id")
            .eq("status", "draft")
            .in("story_id", storyIds)
        : Promise.resolve({ data: [], error: null }),
      storyIds.length > 0
        ? db
            .from("episodes")
            .select("id, story_id, title, episode_number, status, updated_at")
            .in("story_id", storyIds)
            .in("status", ["draft", "pending", "rejected"])
            .order("updated_at", { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [], error: null }),
      storyIds.length > 0
        ? db
            .from("episodes")
            .select("id, story_id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .eq("status", "draft")
        : Promise.resolve({ count: 0, error: null }),
      storyIds.length > 0
        ? db
            .from("episodes")
            .select("id, story_id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .eq("status", "rejected")
        : Promise.resolve({ count: 0, error: null }),
      storyIds.length > 0
        ? db
            .from("episodes")
            .select("id, story_id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .eq("status", "pending")
        : Promise.resolve({ count: 0, error: null })
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

    const { data: scheduledRows, count: scheduledUpcomingCount } = await db
      .from("scheduled_publications")
      .select("id, scheduled_at, story_id, target_id, target_type", {
        count: "exact"
      })
      .eq("creator_id", creatorProfile.user_id)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(3);

    const scheduledUpcoming = scheduledUpcomingCount ?? 0;
    const chapterScheduleIds = (scheduledRows ?? [])
      .filter((row) => row.target_type === "chapter")
      .map((row) => row.target_id as string);

    const scheduledStoryIds = [
      ...new Set(
        (scheduledRows ?? [])
          .map((row) => row.story_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    ];

    const storyTitleById = new Map<string, string>();

    if (scheduledStoryIds.length > 0) {
      const { data: scheduledStories } = await db
        .from("stories")
        .select("id, title")
        .in("id", scheduledStoryIds);

      for (const story of scheduledStories ?? []) {
        storyTitleById.set(story.id as string, story.title as string);
      }
    }

    const episodeMetaById = new Map<
      string,
      { title: string; episode_number: number }
    >();

    if (chapterScheduleIds.length > 0) {
      const { data: episodes } = await db
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
        const episode = episodeMetaById.get(row.target_id as string);
        const storyId = row.story_id as string;

        return {
          editHref: studioPath(
            `/stories/${storyId}/chapters/${row.target_id as string}/edit`
          ),
          episodeId: row.target_id as string,
          episodeNumber: episode?.episode_number ?? 0,
          episodeTitle: episode?.title ?? "Chương",
          publishAt: row.scheduled_at as string,
          statusLabel: "Đã lên lịch",
          storyId,
          storyTitle: storyTitleById.get(storyId) ?? "Truyện"
        };
      });

    let reads7d = 0;
    let saves7d = 0;
    let comments7d = 0;
    let newFollowers7d = 0;
    let readsPrev7d = 0;
    let savesPrev7d = 0;
    let commentsPrev7d = 0;
    let newFollowersPrev7d = 0;

    let performanceSnapshot: StudioPerformanceSnapshot = {
      comments: 0,
      newFollowers: 0,
      reelsViews: null,
      topChapters: [],
      topStories: []
    };

    const missingCoverStories: StudioAttentionPreviewItem[] = [];
    const missingDescriptionStories: StudioAttentionPreviewItem[] = [];

    if (storyIds.length > 0) {
      const { data: currentImages } = await db
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
        const editHref = studioPath(`/stories/${story.id}/edit`);

        if (!hasCover) {
          missingCoverStories.push({
            href: editHref,
            id: story.id,
            title: story.title
          });
        }

        if (!hasDescription) {
          missingDescriptionStories.push({
            href: editHref,
            id: story.id,
            title: story.title
          });
        }
      }

      const [
        readsResult,
        savesResult,
        commentsResult,
        followersResult,
        readsPrevResult,
        savesPrevResult,
        commentsPrevResult,
        followersPrevResult,
        storyReadEventsResult,
        chapterReadEventsResult
      ] = await Promise.all([
        db
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .in("target_id", storyIds)
          .in("event_name", [...READ_EVENT_NAMES])
          .gte("created_at", weekAgo),
        db
          .from("bookshelf_items")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .gte("created_at", weekAgo),
        db
          .from("comments")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .eq("status", "visible")
          .gte("created_at", weekAgo),
        db
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .gte("created_at", weekAgo),
        db
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .in("target_id", storyIds)
          .in("event_name", [...READ_EVENT_NAMES])
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", weekAgo),
        db
          .from("bookshelf_items")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", weekAgo),
        db
          .from("comments")
          .select("id", { count: "exact", head: true })
          .in("story_id", storyIds)
          .eq("status", "visible")
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", weekAgo),
        db
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .gte("created_at", twoWeeksAgo)
          .lt("created_at", weekAgo),
        db
          .from("analytics_events")
          .select("target_id")
          .in("target_id", storyIds)
          .in("event_name", [...READ_EVENT_NAMES])
          .gte("created_at", weekAgo)
          .limit(5000),
        db
          .from("analytics_events")
          .select("target_id")
          .in("target_id", storyIds)
          .in("event_name", [
            analyticsEvents.chapterOpened,
            analyticsEvents.startReading,
            "chapter_opened",
            "start_reading"
          ])
          .gte("created_at", weekAgo)
          .limit(5000)
      ]);

      reads7d = readsResult.count ?? 0;
      saves7d = savesResult.count ?? 0;
      comments7d = commentsResult.count ?? 0;
      newFollowers7d = followersResult.count ?? 0;
      readsPrev7d = readsPrevResult.count ?? 0;
      savesPrev7d = savesPrevResult.count ?? 0;
      commentsPrev7d = commentsPrevResult.count ?? 0;
      newFollowersPrev7d = followersPrevResult.count ?? 0;

      const storyReadCounts = countEventsByTarget(storyReadEventsResult.data);
      const topStoryEntries = [...storyReadCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const storyById = new Map(stories.map((story) => [story.id, story]));

      const topStories = topStoryEntries
        .map(([id, reads]) => {
          const story = storyById.get(id);
          if (!story) {
            return null;
          }

          const isPublicStory =
            story.visibility === "public" &&
            (story.status === "published" || story.status === "approved");

          return {
            href: isPublicStory
              ? getStoryUrl({ slug: story.slug, public_code: story.public_code })
              : studioPath(`/stories/${story.id}/edit`),
            id: story.id,
            reads,
            title: story.title
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const chapterReadCounts = countEventsByTarget(chapterReadEventsResult.data);
      const topChapterIds = [...chapterReadCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);

      let topChapters: StudioPerformanceSnapshot["topChapters"] = [];

      if (topChapterIds.length > 0) {
        const { data: topEpisodeRows } = await db
          .from("episodes")
          .select("id, story_id, title, episode_number, stories(title)")
          .in("id", topChapterIds);

        topChapters = (topEpisodeRows ?? [])
          .map((row) => {
            const story = firstRelation(
              row.stories as { title: string } | { title: string }[] | null
            );
            const reads = chapterReadCounts.get(row.id as string) ?? 0;

            return {
              episodeNumber: row.episode_number as number,
              href: studioPath(
                `/stories/${row.story_id as string}/chapters/${row.id as string}/edit`
              ),
              id: row.id as string,
              reads,
              storyTitle: story?.title ?? "Truyện",
              title: row.title as string
            };
          })
          .sort((a, b) => b.reads - a.reads);
      }

      performanceSnapshot = {
        comments: comments7d,
        newFollowers: newFollowers7d,
        reelsViews: null,
        topChapters,
        topStories
      };
    }

    const storyById = new Map(stories.map((story) => [story.id, story]));

    const continueWriting: CreatorDashboardContinueItem[] = (
      (recentDraftEpisodesResult.data ?? []) as Array<{
        id: string;
        story_id: string;
        title: string;
        episode_number: number;
        status: CreatorDashboardContinueItem["status"];
        updated_at: string;
      }>
    ).map((episode) => {
      const story = storyById.get(episode.story_id);
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
      ? stories[0]?.structure_type === "standalone"
        ? studioPath(`/stories/${defaultStoryId}/content`)
        : studioPath(`/stories/${defaultStoryId}/chapters/new`)
      : studioPath("/stories/new");

    const defaultStructureType = normalizeStoryStructureType(stories[0]?.structure_type);
    const writeActionLabel = getStudioWriteActionLabel(defaultStructureType);
    const writeToolLabel = getStudioWriteToolLabel(defaultStructureType);

    const rejectedCount = rejectedCountResult.count ?? 0;
    const pendingEpisodes = pendingEpisodeCountResult.count ?? 0;
    const pendingStories = moderationStatus.pendingReviewStories;

    const rejectedEditHref =
      continueWriting.find((item) => item.status === "rejected")?.editHref ?? null;

    const attentionGroups = buildAttentionGroups({
      canPublishStories: moderationStatus.canPublishStories,
      comments7d,
      draftChapters,
      missingCoverStories,
      missingDescriptionStories,
      pendingReviewStories: pendingStories,
      qualityNeedsActionCount,
      recentViolationsCount: moderationStatus.recentViolations.length,
      rejectedCount,
      rejectedEditHref
    });

    const todayActions = buildTodayActions({
      calendarHref: studioPath("/calendar"),
      comments7d,
      contentHealthHref: studioPath("/content-health?tab=needs_action"),
      continueWriting,
      draftChapters,
      hasStories,
      missingCoverCount: missingCoverStories.length,
      missingDescriptionCount: missingDescriptionStories.length,
      qualityNeedsActionCount,
      rejectedCount,
      scheduledUpcoming
    });

    const heroSummary = buildHeroSummary({
      comments7d,
      missingCoverCount: missingCoverStories.length,
      pendingEpisodes,
      scheduledUpcoming
    });

    const accountStatus = buildAccountStatus({
      availableRevenueVnd,
      canPublishStories: moderationStatus.canPublishStories,
      creatorProfile,
      monetizationEnabled,
      monetizationStatus: monetizationProfile?.status ?? null,
      qualityNeedsActionCount,
      verificationSummary
    });

    const quickStats = buildQuickStats({
      availableRevenueVnd,
      comments7d,
      commentsPrev7d,
      draftChapters,
      monetizationEnabled,
      newFollowers7d,
      newFollowersPrev7d,
      reads7d,
      readsPrev7d,
      saves7d,
      savesPrev7d,
      scheduledUpcoming
    });

    const alerts = buildLegacyAlerts(attentionGroups);

    return {
      accountStatus,
      alerts,
      attentionGroups,
      continueWriting,
      creatorProfile,
      defaultStoryId,
      defaultStorySlug,
      error: null,
      hasStories,
      heroSummary,
      pendingEpisodes,
      pendingStories,
      performanceSnapshot,
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
      quickStats,
      scheduledChapters,
      todayActions,
      writeChapterHref,
      writeActionLabel,
      writeToolLabel
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
