import type { DatabaseClient } from "@/lib/db/types";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";
import {
  fetchEligibleAuthors
} from "@/lib/ranking/eligible-content";
import { hydrateRankingSnapshots } from "@/lib/ranking/hydrate-items";
import { loadAggregatedStoryMetrics } from "@/lib/ranking/load-metrics-batch";
import { scoreOriginBoardStories } from "@/lib/ranking/ranking-service";
import {
  isEligibleOriginalStory,
  isEligibleTranslatedStory
} from "@/lib/ranking/ranking-formulas";
import {
  computeRankingScore,
  freshnessFromPublishedAt,
  loadRankingWeights,
  reasonFromBoard
} from "@/lib/ranking/score-formula";
import { windowStartDate } from "@/lib/ranking/window";
import { RANKING_METRICS_ACCUMULATING_NOTE } from "@/lib/ranking/ranking-ui-utils";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type {
  RankingBoardResult,
  RankingBoardType,
  RankingScoreBreakdown,
  RankingSnapshotRow,
  RankingTimeWindow
} from "@/types/ranking-board";
import type { GetRankingBoardParams } from "@/lib/ranking/get-board";

const EMPTY_BREAKDOWN: RankingScoreBreakdown = {
  completion_rate: 0,
  next_chapter_rate: 0,
  save_rate: 0,
  follow_rate: 0,
  unlock_rate: 0,
  freshness: 0,
  fairness: 0,
  report_penalty: 0,
  hide_penalty: 0,
  raw_score: 0
};

const STORY_BOARD_TYPES = new Set<RankingBoardType>([
  "top_stories",
  "new_stories",
  "original_stories",
  "translation_stories",
  "completed_stories",
  "rising_stories",
  "most_saved",
  "long_tail_quality"
]);

const MIN_WEEK_ITEMS_BEFORE_EXPAND = 3;

type FallbackStoryRow = {
  id: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_completed: boolean;
  content_origin: string | null;
  monetization_policy: string | null;
  must_be_free_to_read: boolean | null;
  can_sell_chapters: boolean | null;
  can_sell_story_bundle: boolean | null;
  source_url: string | null;
  status: string;
  visibility: string;
  quality_status: string | null;
  moderation_status: string | null;
  authorUserId: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function isEligibleModeration(status: string | null | undefined) {
  return status !== "flagged" && status !== "removed" && status !== "hidden";
}

function activityIso(row: FallbackStoryRow): string | null {
  return row.updated_at ?? row.published_at ?? row.created_at;
}

function isOnOrAfter(iso: string | null, startDate: string | null): boolean {
  if (!startDate) return true;
  if (!iso) return false;
  return iso.slice(0, 10) >= startDate;
}

function daysSince(iso: string | null) {
  if (!iso) return 999;
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function fairnessFromImpressions(impressions: number, medianImpressions: number) {
  if (medianImpressions <= 0) return 0.7;
  if (impressions <= medianImpressions * 0.35) return 0.88;
  if (impressions >= medianImpressions * 2.5) return 0.52;
  return 0.68;
}

function logFallback(message: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[ranking-fallback]", message, data ?? "");
}

function buildSnapshotRows(
  scored: Array<{
    storyId: string;
    authorUserId: string;
    score: number;
    breakdown: RankingScoreBreakdown;
  }>,
  boardType: RankingBoardType,
  timeWindow: RankingTimeWindow,
  offset: number
): RankingSnapshotRow[] {
  const snapshotAt = new Date().toISOString();
  return scored.map((row, index) => ({
    id: `live-fallback-${row.storyId}`,
    ranking_type: boardType,
    time_window: timeWindow,
    taxonomy_term_id: null,
    item_type: "story" as const,
    item_id: row.storyId,
    story_id: row.storyId,
    author_user_id: row.authorUserId,
    rank_position: offset + index + 1,
    score: row.score,
    score_breakdown: row.breakdown,
    snapshot_at: snapshotAt
  }));
}

function passesOriginFilter(row: FallbackStoryRow, boardType: RankingBoardType) {
  if (boardType === "original_stories") {
    return isEligibleOriginalStory({
      id: row.id,
      content_origin: row.content_origin,
      status: row.status,
      visibility: row.visibility,
      moderation_status: row.moderation_status,
      quality_status: row.quality_status,
      monetization_policy: row.monetization_policy,
      must_be_free_to_read: row.must_be_free_to_read,
      can_sell_chapters: row.can_sell_chapters,
      can_sell_story_bundle: row.can_sell_story_bundle,
      source_url: row.source_url,
      authorUserId: row.authorUserId
    }).pass;
  }

  if (boardType === "translation_stories") {
    return isEligibleTranslatedStory({
      id: row.id,
      content_origin: row.content_origin,
      status: row.status,
      visibility: row.visibility,
      moderation_status: row.moderation_status,
      quality_status: row.quality_status,
      monetization_policy: row.monetization_policy,
      must_be_free_to_read: row.must_be_free_to_read,
      can_sell_chapters: row.can_sell_chapters,
      can_sell_story_bundle: row.can_sell_story_bundle,
      source_url: row.source_url,
      authorUserId: row.authorUserId
    }).pass;
  }

  return true;
}

function passesBoardFilter(
  row: FallbackStoryRow,
  boardType: RankingBoardType,
  timeWindow: RankingTimeWindow,
  windowStart: string | null
) {
  if (!passesOriginFilter(row, boardType)) return false;
  if (boardType === "completed_stories" && !row.is_completed) return false;

  if (boardType === "new_stories") {
    return true;
  }

  if (boardType === "top_stories" || boardType === "original_stories" || boardType === "translation_stories") {
    if (timeWindow === "all_time") return true;
    return isOnOrAfter(activityIso(row), windowStart);
  }

  if (timeWindow !== "all_time" && windowStart) {
    return isOnOrAfter(activityIso(row), windowStart);
  }

  return true;
}

async function fetchFallbackStories(
  db: DatabaseClient,
  limit = 500
): Promise<FallbackStoryRow[]> {
  const { data, error } = await db
    .from("stories")
    .select(
      `id, status, visibility, published_at, created_at, updated_at, is_completed, content_origin, monetization_policy, must_be_free_to_read, can_sell_chapters, can_sell_story_bundle, source_url, moderation_status, quality_status, ${CREATOR_PROFILE_STORY_JOIN}`
    )
    .in("status", [...publicContentStatuses])
    .eq("visibility", "public")
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    id: string;
    status: string;
    visibility: string;
    published_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_completed: boolean;
    content_origin: string | null;
    monetization_policy: string | null;
    must_be_free_to_read: boolean | null;
    can_sell_chapters: boolean | null;
    can_sell_story_bundle: boolean | null;
    source_url: string | null;
    moderation_status: string | null;
    quality_status: string | null;
    creator_profiles:
      | { id: string; user_id: string }
      | { id: string; user_id: string }[]
      | null;
  }>)
    .filter((row) => isEligibleModeration(row.moderation_status))
    .map((row) => {
      const creator = firstRelation(row.creator_profiles);
      return {
        id: row.id,
        status: row.status,
        visibility: row.visibility,
        published_at: row.published_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_completed: Boolean(row.is_completed),
        content_origin: row.content_origin,
        monetization_policy: row.monetization_policy,
        must_be_free_to_read: row.must_be_free_to_read,
        can_sell_chapters: row.can_sell_chapters,
        can_sell_story_bundle: row.can_sell_story_bundle,
        source_url: row.source_url,
        quality_status: row.quality_status,
        moderation_status: row.moderation_status,
        authorUserId: creator?.user_id ?? ""
      };
    })
    .filter((row) => Boolean(row.authorUserId));
}

async function scoreStoriesForBoard(
  db: DatabaseClient,
  rows: FallbackStoryRow[],
  boardType: RankingBoardType,
  timeWindow: RankingTimeWindow,
  dayMetricsMap?: Awaited<ReturnType<typeof loadAggregatedStoryMetrics>>
) {
  if (boardType === "original_stories" || boardType === "translation_stories") {
    return scoreOriginBoardStories(db, rows, boardType, timeWindow);
  }

  const weights = await loadRankingWeights();
  const metricsMap = await loadAggregatedStoryMetrics(db, timeWindow);
  const impressions = rows.map((row) => metricsMap.get(row.id)?.impressions ?? 0);
  const medianImpressions = median(impressions);

  const scored: Array<{
    storyId: string;
    authorUserId: string;
    score: number;
    breakdown: RankingScoreBreakdown;
    sortDate: string;
  }> = [];

  for (const row of rows) {
    const metrics = metricsMap.get(row.id);
    const completionRate = metrics?.completionRate ?? 0;
    const nextChapterRate = metrics?.nextChapterRate ?? 0;
    const fairness = fairnessFromImpressions(metrics?.impressions ?? 0, medianImpressions);

    let freshness = freshnessFromPublishedAt(row.published_at);
    if (boardType === "new_stories") {
      freshness = Math.max(freshness, 0.85);
    }

    if (boardType === "long_tail_quality") {
      const imp = metrics?.impressions ?? 0;
      if (imp > medianImpressions * 0.6 && metrics) continue;
      if (completionRate < 0.4 && nextChapterRate < 0.4 && metrics) continue;
    }

    if (boardType === "most_saved" && metrics && (metrics.saveRate ?? 0) < 0.05) {
      continue;
    }

    const hasMetrics = Boolean(metrics && metrics.impressions > 0);
    const { score, breakdown } = computeRankingScore(
      {
        completionRate,
        nextChapterRate,
        saveRate: metrics?.saveRate ?? 0,
        followRate: metrics?.followRate ?? 0,
        unlockRate: metrics?.unlockRate ?? 0,
        freshness,
        fairness,
        reportRate: metrics?.reportRate ?? 0,
        hideRate: metrics?.hideRate ?? 0
      },
      weights
    );

    let adjustedScore = score;
    if (boardType === "most_saved") {
      adjustedScore = hasMetrics ? score * 0.4 + (metrics?.saveRate ?? 0) * 0.6 : freshness;
    }
    if (boardType === "rising_stories") {
      const weekImp = metrics?.impressions ?? 0;
      const dayImp = dayMetricsMap?.get(row.id)?.impressions ?? 0;
      const growth = weekImp > 0 ? (dayImp * 7) / weekImp : freshness;
      adjustedScore = hasMetrics ? score * 0.55 + Math.min(growth, 1.5) * 0.45 : freshness;
    }
    if (!hasMetrics) {
      adjustedScore = Math.max(adjustedScore, freshness * 0.6);
    }

    const reason = reasonFromBoard(boardType, breakdown);
    const sortDate = activityIso(row) ?? row.published_at ?? row.created_at ?? "";

    scored.push({
      storyId: row.id,
      authorUserId: row.authorUserId,
      score: adjustedScore,
      breakdown: { ...breakdown, reason },
      sortDate
    });
  }

  scored.sort((a, b) => {
    if (boardType === "new_stories") {
      return b.sortDate.localeCompare(a.sortDate);
    }
    if (b.score !== a.score) return b.score - a.score;
    return b.sortDate.localeCompare(a.sortDate);
  });

  return scored;
}

async function buildStoryBoardResult(
  db: DatabaseClient,
  params: {
    boardType: RankingBoardType;
    timeWindow: RankingTimeWindow;
    page: number;
    pageSize: number;
    fallbackNote?: string | null;
  }
): Promise<RankingBoardResult | null> {
  const allStories = await fetchFallbackStories(db);
  if (allStories.length === 0) return null;

  let windowStart = windowStartDate(params.timeWindow);
  let fallbackNote = params.fallbackNote ?? null;

  let filtered = allStories.filter((row) =>
    passesBoardFilter(row, params.boardType, params.timeWindow, windowStart)
  );

  if (
    (params.boardType === "top_stories" ||
      params.boardType === "original_stories" ||
      params.boardType === "translation_stories") &&
    params.timeWindow === "week" &&
    filtered.length < MIN_WEEK_ITEMS_BEFORE_EXPAND
  ) {
    windowStart = windowStartDate("month");
    filtered = allStories.filter((row) =>
      passesBoardFilter(row, params.boardType, "month", windowStart)
    );
    fallbackNote = "Dữ liệu tuần đang tích lũy — hiển thị truyện cập nhật trong 30 ngày gần nhất.";
  }

  if (filtered.length === 0) return null;

  const dayMetricsMap =
    params.timeWindow === "week" || params.boardType === "rising_stories"
      ? await loadAggregatedStoryMetrics(db, "day")
      : undefined;

  const scored = await scoreStoriesForBoard(
    db,
    filtered,
    params.boardType,
    params.timeWindow,
    dayMetricsMap
  );

  const totalCount = scored.length;
  if (totalCount === 0) return null;

  const totalPages = Math.ceil(totalCount / params.pageSize);
  const from = (params.page - 1) * params.pageSize;
  const pageSlice = scored.slice(from, from + params.pageSize);
  const rows = buildSnapshotRows(
    pageSlice.map((row) => ({
      storyId: row.storyId,
      authorUserId: row.authorUserId,
      score: row.score,
      breakdown: row.breakdown
    })),
    params.boardType,
    params.timeWindow,
    from
  );

  const items = await hydrateRankingSnapshots(db, rows, params.boardType);
  if (items.length === 0) return null;

  logFallback("story board", {
    boardType: params.boardType,
    timeWindow: params.timeWindow,
    totalCount,
    filtered: filtered.length,
    windowStart,
    fallbackNote
  });

  const usesMetricsFallback = scored.some(
    (row) => "usedFallbackMetrics" in row && Boolean(row.usedFallbackMetrics)
  );

  const isOriginBoard =
    params.boardType === "original_stories" ||
    params.boardType === "translation_stories";
  const metricsNote =
    isOriginBoard && !usesMetricsFallback
      ? null
      : RANKING_METRICS_ACCUMULATING_NOTE;

  return {
    boardType: params.boardType,
    timeWindow: params.timeWindow,
    genreSlug: null,
    items,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
    snapshotAt: rows[0]?.snapshot_at ?? null,
    fallbackNote,
    metricsNote,
    error: null
  };
}

async function buildNewAuthorsBoardResult(
  db: DatabaseClient,
  params: {
    timeWindow: RankingTimeWindow;
    page: number;
    pageSize: number;
  }
): Promise<RankingBoardResult | null> {
  const { fetchEligibleStories } = await import("@/lib/ranking/eligible-content");
  const stories = await fetchEligibleStories(db, 500);
  const authors = await fetchEligibleAuthors(db, stories);

  const eligible = authors.filter((author) => daysSince(author.firstPublishedAt) <= 90);
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const aDate = a.firstPublishedAt ?? "";
    const bDate = b.firstPublishedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  const totalCount = eligible.length;
  const from = (params.page - 1) * params.pageSize;
  const pageAuthors = eligible.slice(from, from + params.pageSize);
  const snapshotAt = new Date().toISOString();

  const rows: RankingSnapshotRow[] = pageAuthors.map((author, index) => ({
    id: `live-fallback-author-${author.userId}`,
    ranking_type: "new_authors",
    time_window: params.timeWindow,
    taxonomy_term_id: null,
    item_type: "author",
    item_id: author.userId,
    story_id: null,
    author_user_id: author.userId,
    rank_position: from + index + 1,
    score: freshnessFromPublishedAt(author.firstPublishedAt),
    score_breakdown: { ...EMPTY_BREAKDOWN, reason: "Tác giả mới", freshness: 0.8 },
    snapshot_at: snapshotAt
  }));

  const items = await hydrateRankingSnapshots(db, rows, "new_authors");
  if (items.length === 0) return null;

  return {
    boardType: "new_authors",
    timeWindow: params.timeWindow,
    genreSlug: null,
    items,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(totalCount / params.pageSize),
    snapshotAt,
    fallbackNote: null,
    metricsNote: RANKING_METRICS_ACCUMULATING_NOTE,
    error: null
  };
}

/** Live ranking from published stories when snapshots are missing or stale. */
export async function getLiveRankingBoardFallback(
  db: DatabaseClient,
  params: GetRankingBoardParams,
  page: number,
  pageSize: number
): Promise<RankingBoardResult | null> {
  if (params.boardType === "genre_stories") {
    return null;
  }

  logFallback("attempt", {
    boardType: params.boardType,
    timeWindow: params.timeWindow,
    page,
    pageSize
  });

  if (STORY_BOARD_TYPES.has(params.boardType)) {
    return buildStoryBoardResult(db, {
      boardType: params.boardType,
      timeWindow: params.timeWindow,
      page,
      pageSize
    });
  }

  if (params.boardType === "new_authors") {
    return buildNewAuthorsBoardResult(db, {
      timeWindow: params.timeWindow,
      page,
      pageSize
    });
  }

  return null;
}
