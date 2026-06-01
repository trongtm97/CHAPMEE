import { createAdminClient } from "@/lib/supabase/admin";
import type { AdFraudDashboard } from "@/types/ad-fraud";

export async function getAdFraudDashboard(): Promise<{
  dashboard: AdFraudDashboard;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();

    const [openRes, criticalRes, heldRes] = await Promise.all([
      supabase
        .from("ad_fraud_signals")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("ad_fraud_signals")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .in("severity", ["critical", "high"]),
      supabase
        .from("ad_revenue_creator_allocations")
        .select("author_id, final_payable_vnd")
        .eq("status", "held")
    ]);

    const heldRows = heldRes.data ?? [];
    const heldCreators = new Set(heldRows.map((r) => String(r.author_id))).size;
    const heldAmountEstimateVnd = heldRows.reduce(
      (s, r) => s + Number(r.final_payable_vnd ?? 0),
      0
    );

    return {
      dashboard: {
        openSignals: openRes.count ?? 0,
        criticalSignals: criticalRes.count ?? 0,
        heldCreators,
        heldAmountEstimateVnd
      },
      error: null
    };
  } catch {
    return {
      dashboard: {
        openSignals: 0,
        criticalSignals: 0,
        heldCreators: 0,
        heldAmountEstimateVnd: 0
      },
      error: "Không tải dashboard fraud."
    };
  }
}
