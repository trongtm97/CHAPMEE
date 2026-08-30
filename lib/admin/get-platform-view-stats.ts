import "server-only";

import {
  CHAPTER_VIEW_EVENT_NAMES,
  CONTENT_POST_VIEW_EVENT_NAMES,
  REELS_VIEW_EVENT_NAMES,
  STORY_VIEW_EVENT_NAMES,
  UTILITY_USE_EVENT_NAMES
} from "@/lib/analytics/read-view-events";
import { createClient } from "@/lib/data/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export type PlatformViewStats = {
  storyViewsTotal: number | null;
  chapterViewsTotal: number | null;
  reelsViewsTotal: number | null;
  articleViewsTotal: number | null;
  utilityUsesTotal: number | null;
  storyViews7d: number | null;
  chapterViews7d: number | null;
  reelsViews7d: number | null;
  articleViews7d: number | null;
  utilityUses7d: number | null;
  allViewsTotal: number | null;
  allViews7d: number | null;
  error: string | null;
};

function sumCounts(values: Array<number | null>) {
  let total = 0;
  for (const value of values) {
    if (value == null) {
      return null;
    }
    total += value;
  }
  return total;
}

async function countAnalyticsEvents(
  eventNames: readonly string[],
  sinceIso?: string
) {
  const dbClient = await createClient();
  let query = dbClient
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .in("event_name", [...eventNames]);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const result = await query;
  if (result.error) {
    return null;
  }
  return result.count ?? 0;
}

async function sumPublishedArticleViews() {
  try {
    const result = await db.execute(sql`
      select coalesce(sum(view_count), 0)::bigint as total
      from public.admin_content_posts
      where status = 'published'
        and deleted_at is null
    `);
    const row = result.rows[0] as { total?: string | number } | undefined;
    return Number(row?.total ?? 0);
  } catch {
    return null;
  }
}

export async function getPlatformViewStats(): Promise<PlatformViewStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      storyViewsTotal,
      chapterViewsTotal,
      reelsViewsTotal,
      articleViewsTotal,
      utilityUsesTotal,
      storyViews7d,
      chapterViews7d,
      reelsViews7d,
      articleViews7d,
      utilityUses7d
    ] = await Promise.all([
      countAnalyticsEvents(STORY_VIEW_EVENT_NAMES),
      countAnalyticsEvents(CHAPTER_VIEW_EVENT_NAMES),
      countAnalyticsEvents(REELS_VIEW_EVENT_NAMES),
      sumPublishedArticleViews(),
      countAnalyticsEvents(UTILITY_USE_EVENT_NAMES),
      countAnalyticsEvents(STORY_VIEW_EVENT_NAMES, weekAgo),
      countAnalyticsEvents(CHAPTER_VIEW_EVENT_NAMES, weekAgo),
      countAnalyticsEvents(REELS_VIEW_EVENT_NAMES, weekAgo),
      countAnalyticsEvents(CONTENT_POST_VIEW_EVENT_NAMES, weekAgo),
      countAnalyticsEvents(UTILITY_USE_EVENT_NAMES, weekAgo)
    ]);

    return {
      storyViewsTotal,
      chapterViewsTotal,
      reelsViewsTotal,
      articleViewsTotal,
      utilityUsesTotal,
      storyViews7d,
      chapterViews7d,
      reelsViews7d,
      articleViews7d,
      utilityUses7d,
      allViewsTotal: sumCounts([
        storyViewsTotal,
        chapterViewsTotal,
        reelsViewsTotal,
        articleViewsTotal,
        utilityUsesTotal
      ]),
      allViews7d: sumCounts([
        storyViews7d,
        chapterViews7d,
        reelsViews7d,
        articleViews7d,
        utilityUses7d
      ]),
      error: null
    };
  } catch (error) {
    return {
      storyViewsTotal: null,
      chapterViewsTotal: null,
      reelsViewsTotal: null,
      articleViewsTotal: null,
      utilityUsesTotal: null,
      storyViews7d: null,
      chapterViews7d: null,
      reelsViews7d: null,
      articleViews7d: null,
      utilityUses7d: null,
      allViewsTotal: null,
      allViews7d: null,
      error: error instanceof Error ? error.message : "Không tải được lượt xem."
    };
  }
}
