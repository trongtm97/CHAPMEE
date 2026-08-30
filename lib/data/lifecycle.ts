import { getPgPool } from "@/lib/db/pool";
import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getNudgesForPlacement } from "@/lib/lifecycle/segments";
import type {
  LifecycleNudgeConfig,
  LifecycleNudgeKey,
  LifecycleNudgePlacement,
  LifecycleSegment,
  LifecycleState
} from "@/types/lifecycle";

type LifecycleStateRow = {
  id: string;
  user_id: string;
  current_segments: string[] | null;
  last_active_at: string | null;
  last_calculated_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type NudgeStateRow = {
  user_id: string;
  nudge_key: string;
  last_shown_at: string | null;
  dismissed_at: string | null;
  show_count: number | null;
};

type LifecycleSignals = {
  lastActiveAt: string | null;
  hasAnyReaderAction: boolean;
  reelsCount: number;
  readCount: number;
  followOrSaveCount: number;
  commentOrVoteCount: number;
  recentReaderEvents3d: number;
  hasEarlyFan: boolean;
  hasTopFan: boolean;
  hasAuthorIntent: boolean;
  hasCreatorProfile: boolean;
  storyCount: number;
  chapterCount: number;
  standaloneContentCount: number;
  chaptersPublishedIn7d: number;
  lastChapterPublishedAt: string | null;
  unrepliedCommentCount: number;
  hasRecentAuthorMilestone: boolean;
};

function toLifecycleState(row: LifecycleStateRow): LifecycleState {
  return {
    id: row.id,
    userId: row.user_id,
    currentSegments: ((row.current_segments ?? []) as string[]).filter(
      (item): item is LifecycleSegment => Boolean(item)
    ),
    lastActiveAt: row.last_active_at,
    lastCalculatedAt: row.last_calculated_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function hoursSince(isoDate: string | null) {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const value = new Date(isoDate).getTime();
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return (Date.now() - value) / (60 * 60 * 1000);
}

function daysSince(isoDate: string | null) {
  return hoursSince(isoDate) / 24;
}

function computeSegments(signals: LifecycleSignals): LifecycleSegment[] {
  const segments: LifecycleSegment[] = [];

  if (!signals.hasAnyReaderAction) {
    segments.push("new_user_no_action");
  }
  if (signals.reelsCount > 0 && signals.followOrSaveCount === 0) {
    segments.push("reels_viewer_no_follow");
  }
  if (signals.readCount > 0 && signals.commentOrVoteCount === 0) {
    segments.push("reader_no_comment");
  }
  if (signals.recentReaderEvents3d >= 4) {
    segments.push("active_reader");
  }

  const inactiveDays = daysSince(signals.lastActiveAt);
  if (inactiveDays >= 7) {
    segments.push("dormant_reader_7d");
  } else if (inactiveDays >= 3) {
    segments.push("dormant_reader_3d");
  }

  if (signals.hasEarlyFan) {
    segments.push("early_fan_user");
  }
  if (signals.hasTopFan) {
    segments.push("top_fan_user");
  }

  if (signals.hasAuthorIntent && signals.storyCount === 0) {
    segments.push("author_no_story");
  }
  if (signals.storyCount > 0 && signals.chapterCount === 0 && signals.standaloneContentCount === 0) {
    segments.push("author_first_story_no_chapter");
  }
  if (signals.storyCount > 0 && daysSince(signals.lastChapterPublishedAt) >= 7) {
    segments.push("author_has_story_no_recent_update");
  }
  if (signals.unrepliedCommentCount > 0) {
    segments.push("author_has_comments_unreplied");
  }
  if (signals.storyCount > 0 && signals.chaptersPublishedIn7d > 0) {
    segments.push("active_author");
  }
  if (signals.hasRecentAuthorMilestone) {
    segments.push("author_milestone_ready");
  }

  return [...new Set(segments)];
}

export async function calculateUserLifecycleSegments(userId: string): Promise<{
  segments: LifecycleSegment[];
  lastActiveAt: string | null;
  metadata: Record<string, unknown>;
}> {
  const db = await createClient();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const reelsEventNames = ["reels_item_viewed", "reels_item_changed", "feed_impression", "feed_skip"];
  const readEventNames = ["open_story", "chapter_opened", "chapter_completed", "complete_chap"];

  const [
    profileResult,
    lastActiveResult,
    reelsResult,
    readResult,
    recentReaderResult,
    followResult,
    savedResult,
    commentResult,
    reactionResult,
    earlyFanResult,
    topFanHighlightsResult,
    creatorResult
  ] = await Promise.all([
    db
      .from("profiles")
      .select("created_at, user_role_preference")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("analytics_events")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("event_name", reelsEventNames),
    db
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("event_name", readEventNames),
    db
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", threeDaysAgo)
      .in("event_name", [...reelsEventNames, ...readEventNames]),
    db
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
    db
      .from("bookshelf_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "saved"),
    db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "visible"),
    db
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("target_type", ["story", "episode"]),
    db
      .from("story_early_fans")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    db.rpc("get_user_top_fan_highlights", {
      input_user_id: userId,
      input_limit: 3
    }),
    db
      .from("creator_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  const profile = profileResult.data as {
    created_at: string | null;
    user_role_preference: "reader" | "author" | "both" | null;
  } | null;
  const creatorId = creatorResult.data?.id ?? null;

  let storyCount = 0;
  let chapterCount = 0;
  let standaloneContentCount = 0;
  let chaptersPublishedIn7d = 0;
  let lastChapterPublishedAt: string | null = null;
  let unrepliedCommentCount = 0;
  let hasRecentAuthorMilestone = false;

  if (creatorId) {
    const storiesResult = await db
      .from("stories")
      .select("id, structure_type, standalone_word_count")
      .eq("creator_id", creatorId)
      .in("status", ["published", "approved", "pending", "draft"]);
    const storyIds = (storiesResult.data ?? []).map((item) => item.id);
    storyCount = storyIds.length;

    standaloneContentCount = (storiesResult.data ?? []).filter(
      (item) =>
        item.structure_type === "standalone" &&
        Number((item as { standalone_word_count?: number }).standalone_word_count ?? 0) > 0
    ).length;

    if (storyIds.length > 0) {
      const [chaptersResult, chaptersRecentResult, commentsResult, milestonesResult] =
        await Promise.all([
          db
            .from("episodes")
            .select("id, published_at")
            .in("story_id", storyIds),
          db
            .from("episodes")
            .select("id", { count: "exact", head: true })
            .in("story_id", storyIds)
            .gte("published_at", sevenDaysAgo),
          db
            .from("comments")
            .select("id, story_id, user_id")
            .in("story_id", storyIds)
            .eq("status", "visible")
            .neq("user_id", userId),
          db
            .from("user_milestones")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .in("milestone_type", ["author", "story"])
            .gte("achieved_at", fourteenDaysAgo)
        ]);

      const chapters = chaptersResult.data ?? [];
      chapterCount = chapters.length;
      chaptersPublishedIn7d = chaptersRecentResult.count ?? 0;
      lastChapterPublishedAt =
        chapters
          .map((item) => item.published_at)
          .filter((item): item is string => Boolean(item))
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      const rootComments = commentsResult.data ?? [];
      if (rootComments.length > 0) {
        const rootIds = rootComments.map((item) => item.id);
        const replyResult = await db
          .from("comments")
          .select("parent_id")
          .in("parent_id", rootIds)
          .eq("user_id", userId)
          .eq("status", "visible");
        const repliedSet = new Set((replyResult.data ?? []).map((item) => item.parent_id));
        unrepliedCommentCount = rootComments.filter((item) => !repliedSet.has(item.id)).length;
      }

      hasRecentAuthorMilestone = (milestonesResult.count ?? 0) > 0;
    }
  }

  const followOrSaveCount = (followResult.count ?? 0) + (savedResult.count ?? 0);
  const commentOrVoteCount = (commentResult.count ?? 0) + (reactionResult.count ?? 0);
  const hasTopFan = Array.isArray(topFanHighlightsResult.data)
    ? topFanHighlightsResult.data.some((item) => Number(item.rank ?? 0) === 1)
    : false;
  const lastActiveAt = lastActiveResult.data?.created_at ?? profile?.created_at ?? null;
  const hasAuthorIntent =
    Boolean(creatorId) ||
    profile?.user_role_preference === "author" ||
    profile?.user_role_preference === "both";
  const signals: LifecycleSignals = {
    lastActiveAt,
    hasAnyReaderAction:
      (reelsResult.count ?? 0) > 0 ||
      (readResult.count ?? 0) > 0 ||
      followOrSaveCount > 0 ||
      commentOrVoteCount > 0,
    reelsCount: reelsResult.count ?? 0,
    readCount: readResult.count ?? 0,
    followOrSaveCount,
    commentOrVoteCount,
    recentReaderEvents3d: recentReaderResult.count ?? 0,
    hasEarlyFan: (earlyFanResult.count ?? 0) > 0,
    hasTopFan,
    hasAuthorIntent,
    hasCreatorProfile: Boolean(creatorId),
    storyCount,
    chapterCount,
    standaloneContentCount,
    chaptersPublishedIn7d,
    lastChapterPublishedAt,
    unrepliedCommentCount,
    hasRecentAuthorMilestone
  };

  const segments = computeSegments(signals);
  return {
    segments,
    lastActiveAt,
    metadata: {
      reelsCount: signals.reelsCount,
      readCount: signals.readCount,
      followOrSaveCount: signals.followOrSaveCount,
      commentOrVoteCount: signals.commentOrVoteCount,
      storyCount: signals.storyCount,
      chapterCount: signals.chapterCount,
      unrepliedCommentCount: signals.unrepliedCommentCount
    }
  };
}

function fallbackLifecycleState(
  userId: string,
  calculated: Awaited<ReturnType<typeof calculateUserLifecycleSegments>>
): LifecycleState {
  const now = new Date().toISOString();
  return {
    id: `fallback-${userId}`,
    userId,
    currentSegments: calculated.segments,
    lastActiveAt: calculated.lastActiveAt,
    lastCalculatedAt: now,
    metadata: calculated.metadata,
    createdAt: now,
    updatedAt: now
  };
}

async function persistLifecycleState(
  userId: string,
  calculated: Awaited<ReturnType<typeof calculateUserLifecycleSegments>>
): Promise<LifecycleState> {
  const now = new Date().toISOString();
  try {
    const pool = getPgPool();
    const result = await pool.query(
      `insert into public.user_lifecycle_states (
        user_id,
        current_segments,
        last_active_at,
        last_calculated_at,
        metadata,
        updated_at
      )
      values ($1::uuid, $2::text[], $3::timestamptz, $4::timestamptz, $5::jsonb, $4::timestamptz)
      on conflict (user_id) do update set
        current_segments = excluded.current_segments,
        last_active_at = excluded.last_active_at,
        last_calculated_at = excluded.last_calculated_at,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
      returning
        id,
        user_id,
        current_segments,
        last_active_at,
        last_calculated_at,
        metadata,
        created_at,
        updated_at`,
      [
        userId,
        calculated.segments,
        calculated.lastActiveAt,
        now,
        JSON.stringify(calculated.metadata ?? {})
      ]
    );
    const row = result.rows[0] as LifecycleStateRow | undefined;
    if (row) {
      return toLifecycleState(row);
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[lifecycle] persist failed:",
        error instanceof Error ? error.message : error
      );
    }
  }
  return fallbackLifecycleState(userId, calculated);
}

export async function refreshUserLifecycleState(userId: string) {
  let existing: LifecycleState | null = null;
  try {
    existing = await getUserLifecycleState(userId);
  } catch (error) {
    if (!isMissingSchemaError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[lifecycle] read existing failed:", error);
      }
    }
  }
  const recalculateAfterMinutes = 30;

  if (existing) {
    const ageMinutes =
      (Date.now() - new Date(existing.lastCalculatedAt).getTime()) / (60 * 1000);
    if (ageMinutes < recalculateAfterMinutes) {
      return existing;
    }
  }

  const calculated = await calculateUserLifecycleSegments(userId);
  return persistLifecycleState(userId, calculated);
}

export async function getUserLifecycleState(userId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("user_lifecycle_states")
    .select(
      "id, user_id, current_segments, last_active_at, last_calculated_at, metadata, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toLifecycleState(data as LifecycleStateRow);
}

function canShowNudge(config: LifecycleNudgeConfig, nudgeState: NudgeStateRow | undefined) {
  if (!nudgeState) {
    return true;
  }

  const hoursSinceShown = hoursSince(nudgeState.last_shown_at);
  const hoursSinceDismiss = hoursSince(nudgeState.dismissed_at);

  if (hoursSinceDismiss < config.dismissCooldownHours) {
    return false;
  }

  return hoursSinceShown >= config.cooldownHours;
}

export async function getLifecycleNudgeForUser(
  userId: string,
  placement: LifecycleNudgePlacement
) {
  try {
    // TODO(crm): reuse lifecycle segments for push/email orchestration when notification automation is enabled.
    const db = await createClient();
    const lifecycleState = await refreshUserLifecycleState(userId);
    const candidates = getNudgesForPlacement(placement).filter((item) =>
      lifecycleState.currentSegments.includes(item.segment)
    );

    if (candidates.length === 0) {
      return null;
    }

    const candidateKeys = candidates.map((item) => item.key);
    const { data, error } = await db
      .from("user_nudge_states")
      .select("user_id, nudge_key, last_shown_at, dismissed_at, show_count")
      .eq("user_id", userId)
      .in("nudge_key", candidateKeys);

    if (error && process.env.NODE_ENV === "development") {
      console.warn("[lifecycle] nudge states:", error.message);
      return candidates[0] ?? null;
    }

    const stateMap = new Map<string, NudgeStateRow>(
      ((data ?? []) as NudgeStateRow[]).map((item) => [item.nudge_key, item])
    );

    return candidates.find((item) => canShowNudge(item, stateMap.get(item.key))) ?? null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[lifecycle] getLifecycleNudgeForUser:",
        error instanceof Error ? error.message : error
      );
    }
    return null;
  }
}

export async function markLifecycleNudgeShown(userId: string, nudgeKey: LifecycleNudgeKey) {
  const db = await createClient();
  const now = new Date().toISOString();
  const { data: current } = await db
    .from("user_nudge_states")
    .select("show_count")
    .eq("user_id", userId)
    .eq("nudge_key", nudgeKey)
    .maybeSingle();

  await db.from("user_nudge_states").upsert(
    {
      user_id: userId,
      nudge_key: nudgeKey,
      last_shown_at: now,
      show_count: Number(current?.show_count ?? 0) + 1
    },
    { onConflict: "user_id,nudge_key" }
  );
}

export async function dismissLifecycleNudge(userId: string, nudgeKey: LifecycleNudgeKey) {
  const db = await createClient();
  const now = new Date().toISOString();
  await db.from("user_nudge_states").upsert(
    {
      user_id: userId,
      nudge_key: nudgeKey,
      dismissed_at: now
    },
    { onConflict: "user_id,nudge_key" }
  );
}
