"use server";

import { createAdminClient } from "@/lib/data/admin";
import { getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import type { AdMonetizationOverview } from "@/types/admin-ad-monetization-settings";

function currentMonthKey() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getAdMonetizationOverview(): Promise<AdMonetizationOverview> {
  const monthKey = currentMonthKey();
  const db = createAdminClient();

  const [policy, estimateSettings, placementsRes, monthStatsRes, lastReconRes, fraudRes, draftReconRes] =
    await Promise.all([
      getCreatorAdRevenuePolicy({ useAdmin: true }),
      getAdRevenueEstimateSettings({ useAdmin: true }),
      db.from("ad_placements").select("id, is_enabled"),
      db
        .from("ad_monthly_author_stats")
        .select("estimated_gross_revenue_vnd")
        .eq("month", monthKey),
      db
        .from("ad_revenue_monthly_reconciliations")
        .select("revenue_month")
        .in("status", ["locked", "reconciled"])
        .order("revenue_month", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("ad_fraud_signals")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "reviewing"]),
      db
        .from("ad_revenue_monthly_reconciliations")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft")
    ]);

  const placements = placementsRes.data ?? [];
  const enabledCount = placements.filter((p) => Boolean(p.is_enabled)).length;

  const currentMonthEstimateGrossVnd = (monthStatsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.estimated_gross_revenue_vnd ?? 0),
    0
  );

  return {
    policy,
    estimateSettings,
    adsPlacementsEnabled: enabledCount,
    adsPlacementsTotal: placements.length,
    currentMonthKey: monthKey,
    currentMonthEstimateGrossVnd,
    lastReconciledMonth: lastReconRes.data?.revenue_month ?? null,
    openFraudSignals: fraudRes.count ?? 0,
    draftReconciliations: draftReconRes.count ?? 0
  };
}
