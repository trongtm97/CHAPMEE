import { createClient } from "@/lib/supabase/server";
import { computeCreatorPoolVnd, getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import type { AdMonthlyAuthorStatRow, CreatorAdRevenueEstimate } from "@/types/ad-revenue";

export async function getCreatorAdRevenueEstimate(
  authorUserId: string
): Promise<{ data: CreatorAdRevenueEstimate | null; visible: boolean; error: string | null }> {
  const settings = await getAdRevenueEstimateSettings();

  if (!settings.is_estimate_visible_to_creators) {
    return { data: null, visible: false, error: null };
  }

  try {
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("ad_monthly_author_stats")
      .select("*")
      .eq("author_id", authorUserId)
      .order("month", { ascending: false })
      .limit(12);

    if (error) {
      return { data: null, visible: true, error: error.message };
    }

    const months = (rows ?? []).map((row) => {
      const monthRow = row as AdMonthlyAuthorStatRow;
      const gross = Number(monthRow.estimated_gross_revenue_vnd ?? 0);
      return {
        ...monthRow,
        rendered_impressions: Number(monthRow.rendered_impressions ?? 0),
        estimated_pageviews: Number(monthRow.estimated_pageviews ?? 0),
        estimated_reads: Number(monthRow.estimated_reads ?? 0),
        estimated_gross_revenue_vnd: gross,
        invalid_adjustment_vnd: Number(monthRow.invalid_adjustment_vnd ?? 0),
        reserve_hold_vnd: Number(monthRow.reserve_hold_vnd ?? 0),
        estimated_payable_vnd: Number(monthRow.estimated_payable_vnd ?? 0),
        creatorPoolEstimateVnd: computeCreatorPoolVnd(gross, settings.creator_pool_percent)
      };
    });

    return {
      data: {
        months,
        settings: {
          creator_pool_percent: settings.creator_pool_percent,
          reserve_percent: settings.reserve_percent,
          min_payout_vnd: settings.min_payout_vnd
        }
      },
      visible: true,
      error: null
    };
  } catch {
    return {
      data: null,
      visible: true,
      error: "Không tải được ước tính doanh thu quảng cáo."
    };
  }
}
