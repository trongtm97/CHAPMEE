import type { DatabaseClient } from "@/lib/db/types";
import { loadColdStartConfig } from "@/lib/cold-start/config";
import type { AuthorColdStartLimit } from "@/types/cold-start";

function todayStartIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function applyAuthorColdStartLimit(
  db: DatabaseClient,
  authorUserId: string
): Promise<AuthorColdStartLimit> {
  const config = await loadColdStartConfig();
  const todayStart = todayStartIso();

  const { count: dailyCount } = await db
    .from("cold_start_tests")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", authorUserId)
    .gte("created_at", todayStart);

  const dailyTestsUsed = dailyCount ?? 0;
  const dailyTestsMax = config.maxTestsPerAuthorPerDay;

  if (dailyTestsUsed >= dailyTestsMax) {
    return {
      allowed: false,
      dailyTestsUsed,
      dailyTestsMax,
      quotaMultiplier: 0,
      reason: "Vượt giới hạn cold start test trong ngày."
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: failedCount } = await db
    .from("cold_start_tests")
    .select("id", { count: "exact", head: true })
    .eq("author_user_id", authorUserId)
    .eq("status", "failed")
    .gte("failed_at", thirtyDaysAgo);

  let quotaMultiplier = 1;
  const failed = failedCount ?? 0;
  if (failed >= 5) quotaMultiplier = 0.25;
  else if (failed >= 3) quotaMultiplier = 0.5;
  else if (failed >= 1) quotaMultiplier = 0.75;

  const { data: authorMetrics } = await db
    .from("author_metrics_daily")
    .select("reports, hides, impressions")
    .eq("author_user_id", authorUserId)
    .gte("metric_date", thirtyDaysAgo.slice(0, 10))
    .limit(30);

  if (authorMetrics && authorMetrics.length > 0) {
    const impressions = authorMetrics.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
    const reports = authorMetrics.reduce((s, r) => s + Number(r.reports ?? 0), 0);
    const hides = authorMetrics.reduce((s, r) => s + Number(r.hides ?? 0), 0);
    const reportRate = impressions > 0 ? reports / impressions : 0;
    const hideRate = impressions > 0 ? hides / impressions : 0;

    if (reportRate > config.reportRateThreshold * 1.5) {
      quotaMultiplier *= 0.4;
    } else if (hideRate > config.hideRateThreshold * 1.5) {
      quotaMultiplier *= 0.5;
    }
  }

  if (quotaMultiplier < 0.15) {
    return {
      allowed: false,
      dailyTestsUsed,
      dailyTestsMax,
      quotaMultiplier,
      reason: "Tác giả có tín hiệu spam/chất lượng thấp — giảm quota cold start."
    };
  }

  return {
    allowed: true,
    dailyTestsUsed,
    dailyTestsMax,
    quotaMultiplier,
    reason: null
  };
}

export function scaledTargetImpressions(base: number, limit: AuthorColdStartLimit) {
  if (!limit.allowed) return 0;
  return Math.max(10, Math.round(base * limit.quotaMultiplier));
}
