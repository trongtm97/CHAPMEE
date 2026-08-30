import type { DatabaseClient } from "@/lib/db/types";
import { windowStartDate } from "@/lib/ranking/window";
import type { RankingTimeWindow } from "@/types/ranking-board";

export type AggregatedStoryMetrics = {
  storyId: string;
  authorUserId: string;
  impressions: number;
  completionRate: number;
  nextChapterRate: number;
  saveRate: number;
  followRate: number;
  unlockRate: number;
  reportRate: number;
  hideRate: number;
};

type StoryMetricRow = {
  story_id: string;
  author_user_id: string;
  impressions: number;
  chapter_completes: number;
  chapter_starts: number;
  next_chapter_clicks: number;
  saves: number;
  follows_generated: number;
  paid_unlocks: number;
  reports: number;
  hides: number;
  completion_rate: number;
  next_chapter_rate: number;
  save_rate: number;
  report_rate: number;
  hide_rate: number;
};

type ReelMetricRow = {
  reel_id: string;
  story_id: string | null;
  author_user_id: string;
  impressions: number;
  read_more_clicks: number;
  reels_to_read_rate: number;
};

export async function loadAggregatedStoryMetrics(
  db: DatabaseClient,
  window: RankingTimeWindow
): Promise<Map<string, AggregatedStoryMetrics>> {
  const map = new Map<string, AggregatedStoryMetrics>();
  const start = windowStartDate(window);

  let query = db
    .from("story_metrics_daily")
    .select(
      "story_id, author_user_id, impressions, chapter_completes, chapter_starts, next_chapter_clicks, saves, follows_generated, paid_unlocks, reports, hides, completion_rate, next_chapter_rate, save_rate, report_rate, hide_rate"
    )
    .limit(10000);

  if (start) {
    query = query.gte("metric_date", start);
  }

  const { data } = await query;
  const byStory = new Map<string, StoryMetricRow[]>();

  for (const row of (data ?? []) as StoryMetricRow[]) {
    byStory.set(row.story_id, [...(byStory.get(row.story_id) ?? []), row]);
  }

  for (const [storyId, rows] of byStory) {
    const impressions = rows.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
    const chapterStarts = rows.reduce((s, r) => s + Number(r.chapter_starts ?? 0), 0);
    const chapterCompletes = rows.reduce((s, r) => s + Number(r.chapter_completes ?? 0), 0);
    const nextClicks = rows.reduce((s, r) => s + Number(r.next_chapter_clicks ?? 0), 0);
    const saves = rows.reduce((s, r) => s + Number(r.saves ?? 0), 0);
    const follows = rows.reduce((s, r) => s + Number(r.follows_generated ?? 0), 0);
    const unlocks = rows.reduce((s, r) => s + Number(r.paid_unlocks ?? 0), 0);
    const reports = rows.reduce((s, r) => s + Number(r.reports ?? 0), 0);
    const hides = rows.reduce((s, r) => s + Number(r.hides ?? 0), 0);

    const avg = (field: keyof (typeof rows)[0]) =>
      rows.reduce((s, r) => s + Number(r[field] ?? 0), 0) / Math.max(rows.length, 1);

    map.set(storyId, {
      storyId,
      authorUserId: (rows[0]?.author_user_id as string) ?? "",
      impressions,
      completionRate:
        chapterStarts > 0
          ? chapterCompletes / chapterStarts
          : avg("completion_rate"),
      nextChapterRate:
        chapterCompletes > 0 ? nextClicks / chapterCompletes : avg("next_chapter_rate"),
      saveRate: impressions > 0 ? saves / impressions : avg("save_rate"),
      followRate: impressions > 0 ? follows / impressions : 0,
      unlockRate: impressions > 0 ? unlocks / impressions : 0,
      reportRate: impressions > 0 ? reports / impressions : avg("report_rate"),
      hideRate: impressions > 0 ? hides / impressions : avg("hide_rate")
    });
  }

  return map;
}

export async function loadAggregatedReelMetrics(
  db: DatabaseClient,
  window: RankingTimeWindow
) {
  const map = new Map<
    string,
    { reelId: string; storyId: string | null; authorUserId: string; reelsToReadRate: number }
  >();
  const start = windowStartDate(window);

  let query = db
    .from("reel_metrics_daily")
    .select("reel_id, story_id, author_user_id, impressions, read_more_clicks, reels_to_read_rate")
    .limit(5000);

  if (start) query = query.gte("metric_date", start);

  const { data } = await query;
  const byReel = new Map<string, ReelMetricRow[]>();

  for (const row of (data ?? []) as ReelMetricRow[]) {
    byReel.set(row.reel_id, [...(byReel.get(row.reel_id) ?? []), row]);
  }

  for (const [reelId, rows] of byReel) {
    const impressions = rows.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
    const readMore = rows.reduce((s, r) => s + Number(r.read_more_clicks ?? 0), 0);
    const avgRate =
      rows.reduce((s, r) => s + Number(r.reels_to_read_rate ?? 0), 0) / Math.max(rows.length, 1);
    map.set(reelId, {
      reelId,
      storyId: rows[0]?.story_id ?? null,
      authorUserId: rows[0]?.author_user_id ?? "",
      reelsToReadRate: impressions > 0 ? readMore / impressions : avgRate
    });
  }

  return map;
}
