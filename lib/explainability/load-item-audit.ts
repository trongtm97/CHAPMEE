import type { SupabaseClient } from "@supabase/supabase-js";
import { buildScoringConfig } from "@/lib/scoring/config";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { loadExposureStats } from "@/lib/scoring/metrics-loader";
import { loadStoryMetricsAggregate } from "@/lib/scoring/metrics-loader";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
  AlgorithmActionSummary,
  AlgorithmColdStartSummary,
  AlgorithmExposureSummary,
  AlgorithmFairnessSummary,
  AlgorithmItemAuditData,
  AlgorithmSafetySummary,
  AlgorithmScoreBreakdown
} from "@/types/algorithm-explanation";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sinceIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function countImpressions(
  supabase: SupabaseClient,
  filter: { itemId?: string; storyId?: string; authorUserId?: string },
  since: string
) {
  let query = supabase
    .from("exposure_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (filter.itemId) query = query.eq("item_id", filter.itemId);
  if (filter.storyId) query = query.eq("story_id", filter.storyId);
  if (filter.authorUserId) query = query.eq("author_user_id", filter.authorUserId);

  const { count } = await query;
  return count ?? 0;
}

async function loadExposureBreakdown(
  supabase: SupabaseClient,
  filter: { itemId?: string; storyId?: string; authorUserId?: string },
  since: string
) {
  let query = supabase
    .from("exposure_events")
    .select("surface, candidate_pool")
    .gte("created_at", since)
    .limit(10000);

  if (filter.itemId) query = query.eq("item_id", filter.itemId);
  if (filter.storyId) query = query.eq("story_id", filter.storyId);
  if (filter.authorUserId) query = query.eq("author_user_id", filter.authorUserId);

  const { data } = await query;
  const bySurface: Record<string, number> = {};
  const byPool: Record<string, number> = {};

  for (const row of data ?? []) {
    const surface = (row.surface as string) ?? "other";
    const pool = (row.candidate_pool as string) ?? "unknown";
    bySurface[surface] = (bySurface[surface] ?? 0) + 1;
    byPool[pool] = (byPool[pool] ?? 0) + 1;
  }

  return { bySurface, byPool, total: (data ?? []).length };
}

async function loadActionSummary(
  supabase: SupabaseClient,
  filter: { storyId?: string; reelId?: string; authorUserId?: string },
  since: string
): Promise<AlgorithmActionSummary> {
  let query = supabase
    .from("user_action_events")
    .select("action_type")
    .gte("created_at", since)
    .limit(8000);

  if (filter.storyId) query = query.eq("story_id", filter.storyId);
  if (filter.reelId) query = query.eq("reel_id", filter.reelId);
  if (filter.authorUserId) query = query.eq("author_user_id", filter.authorUserId);

  const { data } = await query;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const t = row.action_type as string;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  return {
    clicks: counts.get("click") ?? 0,
    readStart: counts.get("read_start") ?? 0,
    readComplete: counts.get("read_complete") ?? 0,
    nextChapter: counts.get("next_chapter_click") ?? 0,
    saves: counts.get("save") ?? 0,
    follows: counts.get("follow_author") ?? 0,
    reports: counts.get("report") ?? 0,
    hides: counts.get("hide") ?? 0
  };
}

async function loadLatestScores(
  supabase: SupabaseClient,
  itemType: string,
  itemId: string
): Promise<AlgorithmScoreBreakdown> {
  const empty: AlgorithmScoreBreakdown = {
    qualityScore: 0,
    freshnessScore: 0,
    discoveryScore: 0,
    fairnessScore: 1,
    safetyScore: 1,
    spamPenalty: 0,
    finalReelsScore: 0,
    finalDiscoverScore: 0,
    finalSearchBoostScore: 0,
    finalRankingScore: 0,
    snapshotAt: null
  };

  const { data } = await supabase
    .from("content_score_snapshots")
    .select("*")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return empty;

  return {
    qualityScore: Number(data.quality_score ?? 0),
    freshnessScore: Number(data.freshness_score ?? 0),
    discoveryScore: Number(data.discovery_score ?? 0),
    fairnessScore: Number(data.fairness_score ?? 1),
    safetyScore: Number(data.safety_score ?? 1),
    spamPenalty: Number(data.spam_penalty ?? 0),
    finalReelsScore: Number(data.final_reels_score ?? 0),
    finalDiscoverScore: Number(data.final_discover_score ?? 0),
    finalSearchBoostScore: Number(data.final_search_boost_score ?? 0),
    finalRankingScore: Number(data.final_ranking_score ?? 0),
    snapshotAt: (data.snapshot_at as string) ?? null
  };
}

async function loadColdStart(
  supabase: SupabaseClient,
  itemType: string,
  itemId: string
): Promise<AlgorithmColdStartSummary> {
  const { data } = await supabase
    .from("cold_start_tests")
    .select("*")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      testId: null,
      status: null,
      targetImpressions: 0,
      deliveredImpressions: 0,
      qualificationMessage: null
    };
  }

  const metrics = data.qualification_metrics as Record<string, unknown> | null;
  let qualificationMessage: string | null = null;
  if (data.status === "qualified") qualificationMessage = "Đã qualify — chuyển growth pool.";
  if (data.status === "failed") qualificationMessage = (data.failure_reason as string) ?? "Test thất bại.";
  if (data.status === "active") {
    qualificationMessage = `Đang test: ${data.delivered_impressions}/${data.target_impressions} impressions.`;
  }

  return {
    testId: data.id as string,
    status: data.status as string,
    targetImpressions: Number(data.target_impressions ?? 0),
    deliveredImpressions: Number(data.delivered_impressions ?? 0),
    qualificationMessage
  };
}

export async function loadStoryAlgorithmAudit(
  supabase: SupabaseClient,
  storyId: string
): Promise<AlgorithmItemAuditData> {
  const { data: story, error } = await supabase
    .from("stories")
    .select(
      "id, title, slug, status, cover_url, hook, short_description, creator_profiles(user_id, pen_name, profiles(display_name, username))"
    )
    .eq("id", storyId)
    .maybeSingle();

  if (error || !story) {
    return emptyAudit("story", storyId, error?.message ?? "Không tìm thấy truyện.");
  }

  const creatorRow = firstRelation(
    story.creator_profiles as unknown as
      | { user_id: string; pen_name: string; profiles: unknown }
      | Array<{ user_id: string; pen_name: string; profiles: unknown }>
      | null
  );
  const profile = firstRelation(
    creatorRow?.profiles as
      | { display_name: string | null; username: string | null }
      | Array<{ display_name: string | null; username: string | null }>
      | null
      | undefined
  );
  const authorUserId = creatorRow?.user_id ?? "";

  return buildAuditData(supabase, {
    itemType: "story",
    itemId: storyId,
    title: story.title as string,
    storyId,
    authorUserId,
    authorDisplayName: creatorRow ? resolvePublicDisplayName(profile, creatorRow) : null,
    authorUsername: profile?.username ?? null,
    contentGaps: [
      !story.cover_url ? "cover" : null,
      !story.short_description && !story.hook ? "description" : null
    ].filter(Boolean) as string[]
  });
}

export async function loadReelAlgorithmAudit(
  supabase: SupabaseClient,
  reelId: string
): Promise<AlgorithmItemAuditData> {
  const { data: reel, error } = await supabase
    .from("reels_items")
    .select("id, hook, title, story_id, owner_id, status")
    .eq("id", reelId)
    .maybeSingle();

  if (error || !reel) {
    return emptyAudit("reel", reelId, error?.message ?? "Không tìm thấy Reels.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", reel.owner_id)
    .maybeSingle();

  return buildAuditData(supabase, {
    itemType: "reel",
    itemId: reelId,
    title: (reel.hook as string) ?? (reel.title as string) ?? "Reels",
    storyId: (reel.story_id as string) ?? null,
    authorUserId: reel.owner_id as string,
    authorDisplayName: (profile?.display_name as string) ?? null,
    authorUsername: (profile?.username as string) ?? null
  });
}

export async function loadAuthorAlgorithmAudit(
  supabase: SupabaseClient,
  authorUserId: string
): Promise<AlgorithmItemAuditData> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", authorUserId)
    .maybeSingle();

  return buildAuditData(supabase, {
    itemType: "author",
    itemId: authorUserId,
    title: (profile?.display_name as string) ?? "Tác giả",
    storyId: null,
    authorUserId,
    authorDisplayName: (profile?.display_name as string) ?? null,
    authorUsername: (profile?.username as string) ?? null
  });
}

async function buildAuditData(
  supabase: SupabaseClient,
  meta: {
    itemType: "story" | "reel" | "author";
    itemId: string;
    title: string;
    storyId: string | null;
    authorUserId: string;
    authorDisplayName: string | null;
    authorUsername: string | null;
    contentGaps?: string[];
  }
): Promise<AlgorithmItemAuditData> {
  try {
    const filter =
      meta.itemType === "author"
        ? { authorUserId: meta.authorUserId }
        : meta.itemType === "reel"
          ? { itemId: meta.itemId }
          : { storyId: meta.storyId ?? meta.itemId };

    const scoreItemType = meta.itemType === "author" ? null : meta.itemType;
    const scoreItemId = meta.itemId;

    const [
      scores,
      imp1d,
      imp7d,
      imp30d,
      exp7d,
      actions,
      coldStart,
      metrics,
      exposureStats,
      adjustments,
      scoreHistory
    ] = await Promise.all([
      scoreItemType
        ? loadLatestScores(supabase, scoreItemType, scoreItemId)
        : Promise.resolve({
            qualityScore: 0,
            freshnessScore: 0,
            discoveryScore: 0,
            fairnessScore: 1,
            safetyScore: 1,
            spamPenalty: 0,
            finalReelsScore: 0,
            finalDiscoverScore: 0,
            finalSearchBoostScore: 0,
            finalRankingScore: 0,
            snapshotAt: null
          } satisfies AlgorithmScoreBreakdown),
      countImpressions(supabase, filter, sinceIso(1)),
      countImpressions(supabase, filter, sinceIso(7)),
      countImpressions(supabase, filter, sinceIso(30)),
      loadExposureBreakdown(supabase, filter, sinceIso(7)),
      loadActionSummary(
        supabase,
        {
          storyId: meta.storyId ?? (meta.itemType === "story" ? meta.itemId : undefined),
          reelId: meta.itemType === "reel" ? meta.itemId : undefined,
          authorUserId: meta.itemType === "author" ? meta.authorUserId : undefined
        },
        sinceIso(7)
      ),
      meta.itemType === "author"
        ? Promise.resolve({
            testId: null,
            status: null,
            targetImpressions: 0,
            deliveredImpressions: 0,
            qualificationMessage: null
          } satisfies AlgorithmColdStartSummary)
        : loadColdStart(supabase, meta.itemType, meta.itemId),
      meta.storyId || meta.itemType === "story"
        ? loadStoryMetricsAggregate(supabase, meta.storyId ?? meta.itemId, "7d")
        : Promise.resolve(null),
      loadExposureStats(supabase, {
        authorUserId: meta.authorUserId,
        storyId: meta.storyId ?? (meta.itemType === "story" ? meta.itemId : null),
        itemId: meta.itemId,
        itemType: meta.itemType === "reel" ? "reel" : "story"
      }),
      supabase
        .from("fairness_adjustment_logs")
        .select("id, adjustment_type, surface, reason, old_score, new_score, created_at")
        .eq(
          meta.itemType === "author" ? "author_user_id" : "item_id",
          meta.itemType === "author" ? meta.authorUserId : meta.itemId
        )
        .order("created_at", { ascending: false })
        .limit(15),
      scoreItemType
        ? supabase
            .from("content_score_snapshots")
            .select("snapshot_at, final_discover_score, final_reels_score")
            .eq("item_type", scoreItemType)
            .eq("item_id", scoreItemId)
            .order("snapshot_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] }),
    ]);

    const rawConfig = await getAlgorithmConfig();
    const config = buildScoringConfig(rawConfig);

    const fairness: AlgorithmFairnessSummary = {
      authorSharePercent: exposureStats.authorSharePercent,
      storySharePercent: exposureStats.storySharePercent,
      authorOverCap: exposureStats.authorSharePercent > config.fairness.authorExposureCap7dPercent,
      storyOverCap: exposureStats.storySharePercent > config.fairness.storyExposureCap7dPercent,
      authorCapPercent: config.fairness.authorExposureCap7dPercent,
      storyCapPercent: config.fairness.storyExposureCap7dPercent,
      penaltyApplied: (adjustments.data ?? []).some((row) =>
        String(row.adjustment_type).includes("penalty")
      ),
      recentAdjustments: adjustments.data?.length ?? 0
    };

    const safety: AlgorithmSafetySummary = {
      reportRate: metrics?.reportRate ?? 0,
      hideRate: metrics?.hideRate ?? 0,
      completionRate: metrics?.completionRate ?? 0,
      nextChapterRate: metrics?.nextChapterRate ?? 0,
      policyWarning: (metrics?.reportRate ?? 0) > config.safety.reportRateThreshold,
      spamWarning: scores.spamPenalty > 0.15
    };

    const exposure: AlgorithmExposureSummary = {
      impressions1d: imp1d,
      impressions7d: imp7d,
      impressions30d: imp30d,
      bySurface: exp7d.bySurface,
      byPool: exp7d.byPool
    };

    const auditBase = {
      error: null,
      ...meta,
      scores,
      exposure,
      actions,
      fairness,
      coldStart,
      safety,
      scoreHistory: (scoreHistory.data ?? []).map((row) => ({
        snapshotAt: row.snapshot_at as string,
        finalDiscover: Number(row.final_discover_score ?? 0),
        finalReels: Number(row.final_reels_score ?? 0)
      })),
      adjustmentLogs: (adjustments.data ?? []).map((row) => ({
        id: row.id as string,
        adjustmentType: row.adjustment_type as string,
        surface: row.surface as string,
        reason: row.reason as string | null,
        oldScore: Number(row.old_score),
        newScore: Number(row.new_score),
        createdAt: row.created_at as string
      }))
    };

    const { generateAdminAlgorithmExplanation, generateCreatorAlgorithmExplanation } =
      await import("@/lib/explainability/explanations");

    const adminExplanations = generateAdminAlgorithmExplanation(auditBase);
    let creatorExplanations = generateCreatorAlgorithmExplanation(auditBase);

    if (meta.contentGaps?.length) {
      creatorExplanations = [
        {
          explanationType: "quality",
          visibility: "creator",
          title: "Nội dung đang thiếu ảnh/SEO/mô tả",
          message:
            "Ảnh bìa, hook hoặc mô tả ngắn chưa đầy đủ — cập nhật để tăng CTR và khả năng được đề xuất trên Discover/Search.",
          severity: "warning"
        },
        ...creatorExplanations
      ];
    }

    return {
      ...auditBase,
      adminExplanations,
      creatorExplanations
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return emptyAudit(meta.itemType, meta.itemId, "Thiếu bảng tracking — chạy migrations 147+.");
    }
    return emptyAudit(
      meta.itemType,
      meta.itemId,
      error instanceof Error ? error.message : "Không tải được audit."
    );
  }
}

function emptyAudit(
  itemType: "story" | "reel" | "author",
  itemId: string,
  error: string
): AlgorithmItemAuditData {
  return {
    error,
    itemType,
    itemId,
    title: itemId,
    storyId: null,
    authorUserId: "",
    authorDisplayName: null,
    authorUsername: null,
    scores: {
      qualityScore: 0,
      freshnessScore: 0,
      discoveryScore: 0,
      fairnessScore: 1,
      safetyScore: 1,
      spamPenalty: 0,
      finalReelsScore: 0,
      finalDiscoverScore: 0,
      finalSearchBoostScore: 0,
      finalRankingScore: 0,
      snapshotAt: null
    },
    exposure: {
      impressions1d: 0,
      impressions7d: 0,
      impressions30d: 0,
      bySurface: {},
      byPool: {}
    },
    actions: {
      clicks: 0,
      readStart: 0,
      readComplete: 0,
      nextChapter: 0,
      saves: 0,
      follows: 0,
      reports: 0,
      hides: 0
    },
    fairness: {
      authorSharePercent: 0,
      storySharePercent: 0,
      authorOverCap: false,
      storyOverCap: false,
      authorCapPercent: 10,
      storyCapPercent: 8,
      penaltyApplied: false,
      recentAdjustments: 0
    },
    coldStart: {
      testId: null,
      status: null,
      targetImpressions: 0,
      deliveredImpressions: 0,
      qualificationMessage: null
    },
    safety: {
      reportRate: 0,
      hideRate: 0,
      completionRate: 0,
      nextChapterRate: 0,
      policyWarning: false,
      spamWarning: false
    },
    adminExplanations: [],
    creatorExplanations: [],
    scoreHistory: [],
    adjustmentLogs: []
  };
}
