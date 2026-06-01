import { calculateGini, topPercentShare } from "@/lib/fairness/gini";
import type { ExposureShareBreakdown, FairnessExposureWindow } from "@/types/fairness";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS: Record<FairnessExposureWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

const POOL_BUCKETS = {
  new_author: ["new_author"],
  under_exposed: ["under_exposed"],
  long_tail: ["long_tail_quality", "long_tail"]
} as const;

type ExposureRow = {
  author_user_id: string | null;
  story_id: string | null;
  candidate_pool: string | null;
  surface?: string | null;
};

export function windowStartIso(window: FairnessExposureWindow) {
  return new Date(Date.now() - WINDOW_MS[window]).toISOString();
}

export async function calculateExposureShare(
  supabase: SupabaseClient,
  surface: string,
  window: FairnessExposureWindow = "7d"
): Promise<ExposureShareBreakdown> {
  return calculateExposureShareFiltered(supabase, { surface, window });
}

export async function calculateExposureShareFiltered(
  supabase: SupabaseClient,
  options: {
    surface?: string | null;
    window?: FairnessExposureWindow;
  }
): Promise<ExposureShareBreakdown> {
  const window = options.window ?? "7d";
  const since = windowStartIso(window);

  let query = supabase
    .from("exposure_events")
    .select("author_user_id, story_id, candidate_pool, surface")
    .gte("created_at", since)
    .limit(50000);

  if (options.surface) {
    query = query.eq("surface", options.surface);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const authorImpressions = new Map<string, number>();
  const storyImpressions = new Map<string, number>();
  const poolCounts: Record<string, number> = {};

  for (const row of (data ?? []) as ExposureRow[]) {
    if (row.author_user_id) {
      authorImpressions.set(
        row.author_user_id,
        (authorImpressions.get(row.author_user_id) ?? 0) + 1
      );
    }
    if (row.story_id) {
      storyImpressions.set(
        row.story_id,
        (storyImpressions.get(row.story_id) ?? 0) + 1
      );
    }
    const pool = row.candidate_pool ?? "unknown";
    poolCounts[pool] = (poolCounts[pool] ?? 0) + 1;
  }

  const totalImpressions = (data ?? []).length;
  const poolShare = (keys: readonly string[]) => {
    if (totalImpressions <= 0) return 0;
    const sum = keys.reduce((s, key) => s + (poolCounts[key] ?? 0), 0);
    return (sum / totalImpressions) * 100;
  };

  const coldStartShare =
    (poolCounts.cold_start ?? 0) / Math.max(totalImpressions, 1) * 100;

  return {
    surface: options.surface ?? "all",
    window,
    totalImpressions,
    authorImpressions,
    storyImpressions,
    top1PercentAuthorShare: topPercentShare(authorImpressions, totalImpressions, 1),
    top5PercentAuthorShare: topPercentShare(authorImpressions, totalImpressions, 5),
    top10PercentAuthorShare: topPercentShare(authorImpressions, totalImpressions, 10),
    top1PercentStoryShare: topPercentShare(storyImpressions, totalImpressions, 1),
    top10PercentStoryShare: topPercentShare(storyImpressions, totalImpressions, 10),
    giniAuthor: calculateGini([...authorImpressions.values()]),
    giniStory: calculateGini([...storyImpressions.values()]),
    newAuthorImpressionShare: poolShare(POOL_BUCKETS.new_author) + coldStartShare * 0.35,
    underExposedImpressionShare: poolShare(POOL_BUCKETS.under_exposed),
    longTailImpressionShare: poolShare(POOL_BUCKETS.long_tail),
    poolImpressionShares: Object.fromEntries(
      Object.entries(poolCounts).map(([pool, count]) => [
        pool,
        totalImpressions > 0 ? (count / totalImpressions) * 100 : 0
      ])
    )
  };
}

export function topEntitiesFromMap(
  impressions: Map<string, number>,
  total: number,
  limit = 15
) {
  return [...impressions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, impressionsCount]) => ({
      id,
      impressions: impressionsCount,
      sharePercent: total > 0 ? (impressionsCount / total) * 100 : 0
    }));
}
