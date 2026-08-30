import { createAdminClient } from "@/lib/data/admin";
import {
  computeCreatorPoolVnd,
  computeReserveHoldVnd,
  getAdRevenueEstimateSettings
} from "@/lib/ads/ad-revenue-settings";
import type { AdRevenueAdminDashboard, AdRevenueAdminFilters } from "@/types/ad-revenue";

function monthToRange(month: string): { from: string; to: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`
  };
}

export async function getAdRevenueAdminDashboard(
  filters: AdRevenueAdminFilters = {}
): Promise<{ dashboard: AdRevenueAdminDashboard; error: string | null }> {
  try {
    const settings = await getAdRevenueEstimateSettings({ useAdmin: true });
    const db = createAdminClient();

    let from = filters.from;
    let to = filters.to;
    if (filters.month) {
      const range = monthToRange(filters.month);
      if (range) {
        from = range.from;
        to = range.to;
      }
    }

    if (!from || !to) {
      const now = new Date();
      to = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      from = start.toISOString().slice(0, 10);
    }

    let dailyQuery = db
      .from("ad_daily_author_stats")
      .select("*")
      .gte("stat_date", from)
      .lte("stat_date", to);

    if (filters.authorId) dailyQuery = dailyQuery.eq("author_id", filters.authorId);
    if (filters.storyId) dailyQuery = dailyQuery.eq("story_id", filters.storyId);
    if (filters.placementKey) dailyQuery = dailyQuery.eq("placement_key", filters.placementKey);
    if (filters.surface) dailyQuery = dailyQuery.eq("surface", filters.surface);
    if (filters.device) dailyQuery = dailyQuery.eq("device", filters.device);

    const { data: dailyRows, error } = await dailyQuery;
    if (error) {
      return {
        dashboard: emptyDashboard(),
        error: error.message
      };
    }

    const rows = dailyRows ?? [];
    let totalRenderedImpressions = 0;
    let estimatedGrossRevenueVnd = 0;
    let invalidAdjustmentVnd = 0;

    const byAuthor = new Map<
      string,
      { impressions: number; gross: number; payable: number }
    >();
    const byStory = new Map<string, { impressions: number; gross: number }>();

    for (const row of rows) {
      const impressions = Number(row.rendered_impressions ?? 0);
      const gross = Number(row.estimated_revenue_vnd ?? 0);
      const invalid = Number(row.invalid_adjustment_vnd ?? 0);
      const authorId = String(row.author_id);

      totalRenderedImpressions += impressions;
      estimatedGrossRevenueVnd += gross;
      invalidAdjustmentVnd += invalid;

      const authorAgg = byAuthor.get(authorId) ?? { impressions: 0, gross: 0, payable: 0 };
      authorAgg.impressions += impressions;
      authorAgg.gross += gross;
      byAuthor.set(authorId, authorAgg);

      if (row.story_id) {
        const storyId = String(row.story_id);
        const storyAgg = byStory.get(storyId) ?? { impressions: 0, gross: 0 };
        storyAgg.impressions += impressions;
        storyAgg.gross += gross;
        byStory.set(storyId, storyAgg);
      }
    }

    const creatorPoolEstimateVnd = computeCreatorPoolVnd(
      estimatedGrossRevenueVnd,
      settings.creator_pool_percent
    );
    const reserveHoldEstimateVnd = computeReserveHoldVnd(
      creatorPoolEstimateVnd,
      settings.reserve_percent
    );

    const authorIds = [...byAuthor.keys()].slice(0, 20);
    const storyIds = [...byStory.keys()].slice(0, 20);

    const [{ data: profiles }, { data: stories }] = await Promise.all([
      authorIds.length
        ? db
            .from("profiles")
            .select("id, display_name, username")
            .in("id", authorIds)
        : Promise.resolve({ data: [] }),
      storyIds.length
        ? db.from("stories").select("id, title").in("id", storyIds)
        : Promise.resolve({ data: [] })
    ]);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [String(p.id), p as { display_name: string | null; username: string | null }])
    );
    const storyMap = new Map((stories ?? []).map((s) => [String(s.id), s as { title: string | null }]));

    const topAuthors = [...byAuthor.entries()]
      .sort((a, b) => b[1].gross - a[1].gross)
      .slice(0, 10)
      .map(([authorId, agg]) => {
        const pool = computeCreatorPoolVnd(agg.gross, settings.creator_pool_percent);
        const payable = pool * (1 - settings.reserve_percent / 100);
        const profile = profileMap.get(authorId);
        return {
          authorId,
          displayName: profile?.display_name ?? null,
          username: profile?.username ?? null,
          renderedImpressions: agg.impressions,
          estimatedGrossRevenueVnd: agg.gross,
          estimatedPayableVnd: payable
        };
      });

    const topStories = [...byStory.entries()]
      .sort((a, b) => b[1].impressions - a[1].impressions)
      .slice(0, 10)
      .map(([storyId, agg]) => ({
        storyId,
        title: storyMap.get(storyId)?.title ?? null,
        renderedImpressions: agg.impressions,
        estimatedGrossRevenueVnd: agg.gross
      }));

    return {
      dashboard: {
        totalRenderedImpressions,
        estimatedGrossRevenueVnd,
        creatorPoolEstimateVnd,
        reserveHoldEstimateVnd,
        invalidAdjustmentVnd,
        topAuthors,
        topStories
      },
      error: null
    };
  } catch {
    return { dashboard: emptyDashboard(), error: "Không tải được báo cáo quảng cáo." };
  }
}

function emptyDashboard(): AdRevenueAdminDashboard {
  return {
    totalRenderedImpressions: 0,
    estimatedGrossRevenueVnd: 0,
    creatorPoolEstimateVnd: 0,
    reserveHoldEstimateVnd: 0,
    invalidAdjustmentVnd: 0,
    topAuthors: [],
    topStories: []
  };
}

export async function listAdDailyStatsForExport(filters: AdRevenueAdminFilters = {}) {
  const db = createAdminClient();
  let from = filters.from;
  let to = filters.to;
  if (filters.month) {
    const range = monthToRange(filters.month);
    if (range) {
      from = range.from;
      to = range.to;
    }
  }

  let query = db.from("ad_daily_author_stats").select("*").order("stat_date", { ascending: false });
  if (from) query = query.gte("stat_date", from);
  if (to) query = query.lte("stat_date", to);
  if (filters.authorId) query = query.eq("author_id", filters.authorId);
  if (filters.storyId) query = query.eq("story_id", filters.storyId);
  if (filters.placementKey) query = query.eq("placement_key", filters.placementKey);
  if (filters.surface) query = query.eq("surface", filters.surface);
  if (filters.device) query = query.eq("device", filters.device);

  const { data, error } = await query.limit(5000);
  const rows = Array.isArray(data) ? data : [];
  return { rows, error: error?.message ?? null };
}
