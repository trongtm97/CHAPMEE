import type { DatabaseClient } from "@/lib/db/types";
import { loadAggregatedStoryMetrics } from "@/lib/ranking/load-metrics-batch";
import { priorPeriodStartDate, windowStartDate } from "@/lib/ranking/ranking-period";
import type { OriginRankingMetricsBundle } from "@/lib/ranking/ranking-types";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { RankingTimeWindow } from "@/types/ranking-board";

const EMPTY_BUNDLE = (storyId: string): OriginRankingMetricsBundle => ({
  storyId,
  validReads: 0,
  chapterStarts: 0,
  chapterCompletes: 0,
  nextChapterClicks: 0,
  saves: 0,
  follows: 0,
  comments: 0,
  reactions: 0,
  reviews: 0,
  boostPoints: 0,
  tipsVnd: 0,
  paidUnlocks: 0,
  chaptersPublishedInPeriod: 0,
  daysSinceLastChapter: null,
  newReaders: 0,
  priorPeriodValidReads: 0,
  avgReviewOverall: null,
  avgWritingStyle: null,
  reportRate: 0,
  hideRate: 0,
  hasSourceUrl: false,
  antiFraud: {},
  quality: {}
});

function daysSinceIso(iso: string | null): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

async function loadPriorPeriodStoryMetrics(
  db: DatabaseClient,
  priorStart: string,
  windowStart: string
): Promise<Map<string, { validReads: number }>> {
  const map = new Map<string, { validReads: number }>();
  try {
    const { data, error } = await db
      .from("story_metrics_daily")
      .select("story_id, chapter_completes, chapter_starts")
      .gte("metric_date", priorStart)
      .lt("metric_date", windowStart)
      .limit(10000);

    if (error) {
      if (isMissingSchemaError(error)) return map;
      throw error;
    }

    for (const row of data ?? []) {
      const id = String(row.story_id);
      const completes = Number(row.chapter_completes ?? 0);
      const starts = Number(row.chapter_starts ?? 0);
      const current = map.get(id)?.validReads ?? 0;
      map.set(id, { validReads: current + Math.max(completes, Math.round(starts * 0.35)) });
    }
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }
  return map;
}

async function loadBoostPointsByStory(
  db: DatabaseClient,
  storyIds: string[],
  windowStart: string | null
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (storyIds.length === 0) return map;

  try {
    let query = db
      .from("story_boost_daily_stats")
      .select("story_id, total_boost_points, stat_date")
      .in("story_id", storyIds)
      .limit(5000);

    if (windowStart) {
      query = query.gte("stat_date", windowStart);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingSchemaError(error)) return map;
      throw error;
    }

    for (const row of data ?? []) {
      const id = String(row.story_id);
      map.set(id, (map.get(id) ?? 0) + Number(row.total_boost_points ?? 0));
    }
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }

  return map;
}

async function loadReviewStatsByStory(
  db: DatabaseClient,
  storyIds: string[]
): Promise<Map<string, { avgOverall: number | null; avgWritingStyle: number | null; reviewCount: number }>> {
  const map = new Map<
    string,
    { avgOverall: number | null; avgWritingStyle: number | null; reviewCount: number }
  >();
  if (storyIds.length === 0) return map;

  try {
    const { data, error } = await db
      .from("story_review_stats")
      .select("story_id, avg_overall, avg_writing_style, review_count")
      .in("story_id", storyIds);

    if (error) {
      if (isMissingSchemaError(error)) return map;
      throw error;
    }

    for (const row of data ?? []) {
      map.set(String(row.story_id), {
        avgOverall: row.avg_overall != null ? Number(row.avg_overall) : null,
        avgWritingStyle:
          row.avg_writing_style != null ? Number(row.avg_writing_style) : null,
        reviewCount: Number(row.review_count ?? 0)
      });
    }
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }

  return map;
}

async function loadChapterCadenceByStory(
  db: DatabaseClient,
  storyIds: string[],
  windowStart: string | null
): Promise<Map<string, { countInPeriod: number; lastPublishedAt: string | null }>> {
  const map = new Map<string, { countInPeriod: number; lastPublishedAt: string | null }>();
  if (storyIds.length === 0) return map;

  try {
    let query = db
      .from("episodes")
      .select("story_id, published_at")
      .in("story_id", storyIds)
      .in("status", [...publicContentStatuses])
      .order("published_at", { ascending: false })
      .limit(5000);

    const { data, error } = await query;
    if (error) {
      if (isMissingSchemaError(error)) return map;
      throw error;
    }

    for (const row of data ?? []) {
      const id = String(row.story_id);
      const publishedAt = (row.published_at as string | null) ?? null;
      const current = map.get(id) ?? { countInPeriod: 0, lastPublishedAt: null };

      if (!current.lastPublishedAt && publishedAt) {
        current.lastPublishedAt = publishedAt;
      }

      if (windowStart && publishedAt && publishedAt.slice(0, 10) >= windowStart) {
        current.countInPeriod += 1;
      } else if (!windowStart && publishedAt) {
        current.countInPeriod += 1;
      }

      map.set(id, current);
    }
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }

  return map;
}

/** Batch-load raw metrics for official origin/translation ranking formulas. */
export async function loadOriginRankingInputBatch(
  db: DatabaseClient,
  storyIds: string[],
  timeWindow: RankingTimeWindow,
  storyMeta: Map<
    string,
    {
      sourceUrl: string | null;
      reportRate?: number;
      hideRate?: number;
    }
  >
): Promise<Map<string, OriginRankingMetricsBundle>> {
  const result = new Map<string, OriginRankingMetricsBundle>();
  if (storyIds.length === 0) return result;

  const priorStart = priorPeriodStartDate(timeWindow);
  const windowStart = windowStartDate(timeWindow);

  const [currentMetrics, priorMetricsRaw, boostMap, reviewMap, chapterMap] =
    await Promise.all([
      loadAggregatedStoryMetrics(db, timeWindow),
      priorStart && windowStart
        ? loadPriorPeriodStoryMetrics(db, priorStart, windowStart)
        : Promise.resolve(new Map<string, { validReads: number }>()),
      loadBoostPointsByStory(db, storyIds, windowStart),
      loadReviewStatsByStory(db, storyIds),
      loadChapterCadenceByStory(db, storyIds, windowStart)
    ]);

  for (const storyId of storyIds) {
    const base = EMPTY_BUNDLE(storyId);
    const metrics = currentMetrics.get(storyId);
    const prior = priorMetricsRaw.get(storyId);
    const boost = boostMap.get(storyId) ?? 0;
    const review = reviewMap.get(storyId);
    const chapter = chapterMap.get(storyId);
    const meta = storyMeta.get(storyId);

    const chapterCompletes = metrics?.impressions
      ? Math.round((metrics.completionRate ?? 0) * (metrics.impressions ?? 0))
      : 0;

    result.set(storyId, {
      ...base,
      validReads: chapterCompletes,
      chapterStarts: metrics?.impressions ?? 0,
      chapterCompletes,
      nextChapterClicks: Math.round(
        (metrics?.nextChapterRate ?? 0) * Math.max(chapterCompletes, 1)
      ),
      saves: Math.round((metrics?.saveRate ?? 0) * Math.max(metrics?.impressions ?? 0, 0)),
      follows: Math.round((metrics?.followRate ?? 0) * Math.max(metrics?.impressions ?? 0, 0)),
      boostPoints: boost,
      paidUnlocks: Math.round(
        (metrics?.unlockRate ?? 0) * Math.max(metrics?.impressions ?? 0, 0)
      ),
      chaptersPublishedInPeriod: chapter?.countInPeriod ?? 0,
      daysSinceLastChapter: daysSinceIso(chapter?.lastPublishedAt ?? null),
      newReaders: chapterCompletes,
      priorPeriodValidReads: prior?.validReads ?? 0,
      reviews: review?.reviewCount ?? 0,
      avgReviewOverall: review?.avgOverall ?? null,
      avgWritingStyle: review?.avgWritingStyle ?? null,
      reportRate: metrics?.reportRate ?? meta?.reportRate ?? 0,
      hideRate: metrics?.hideRate ?? meta?.hideRate ?? 0,
      hasSourceUrl: Boolean(meta?.sourceUrl),
      antiFraud: {
        reportViolation: (metrics?.reportRate ?? 0) > 0.08,
        sourceProgressStale:
          (chapter?.lastPublishedAt ? daysSinceIso(chapter.lastPublishedAt)! : 999) > 90
      },
      quality: {}
    });
  }

  return result;
}
