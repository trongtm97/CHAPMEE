import { computeCreatorPoolVnd } from "@/lib/ads/ad-revenue-settings";
import { getCreatorAdRevenueEstimate } from "@/lib/ads/get-creator-ad-revenue-estimate";
import { getCreatorReconciledAdRevenueMonths } from "@/lib/ads/reconciliation";
import { getCreatorComplianceForStudio } from "@/lib/creator-ad-revenue/get-creator-compliance-for-studio";
import { getCreatorAdSharingStatusForStudio } from "@/lib/creator-ad-revenue/get-creator-sharing-status";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import type {
  CreatorAdRevenueDashboard,
  CreatorAdRevenueEstimateMonthView
} from "@/types/creator-ad-revenue-dashboard";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getCreatorAdRevenueDashboard(
  userId: string
): Promise<CreatorAdRevenueDashboard> {
  const monthNow = currentMonthKey();

  const [sharing, estimateResult, reconciliationResult, compliance, policy] =
    await Promise.all([
      getCreatorAdSharingStatusForStudio(userId),
      getCreatorAdRevenueEstimate(userId),
      getCreatorReconciledAdRevenueMonths(userId),
      getCreatorComplianceForStudio(userId),
      getCreatorAdRevenuePolicy()
    ]);

  let currentMonth: CreatorAdRevenueEstimateMonthView | null = null;
  let settings = estimateResult.data?.settings ?? null;

  if (estimateResult.visible && estimateResult.data) {
    const row = estimateResult.data.months.find((m) => m.month === monthNow);
    if (row) {
      currentMonth = {
        month: row.month,
        rendered_impressions: row.rendered_impressions,
        estimated_gross_revenue_vnd: row.estimated_gross_revenue_vnd,
        creator_pool_estimate_vnd: row.creatorPoolEstimateVnd,
        reserve_hold_estimate_vnd: row.reserve_hold_vnd,
        estimated_payable_vnd: row.estimated_payable_vnd
      };
    } else if (estimateResult.data.months.length > 0) {
      const latest = estimateResult.data.months[0];
      currentMonth = {
        month: latest.month,
        rendered_impressions: latest.rendered_impressions,
        estimated_gross_revenue_vnd: latest.estimated_gross_revenue_vnd,
        creator_pool_estimate_vnd: latest.creatorPoolEstimateVnd,
        reserve_hold_estimate_vnd: latest.reserve_hold_vnd,
        estimated_payable_vnd: latest.estimated_payable_vnd
      };
    }
    settings = estimateResult.data.settings;
  }

  const reconciledMonths = reconciliationResult.months.filter(
    (m) => m.label === "reconciled"
  );
  const estimateMonthsInHistory = reconciliationResult.months.filter(
    (m) => m.label === "estimate"
  );

  return {
    sharing: {
      ...sharing,
      policyText: policy.policy_text ?? sharing.policyText,
      policy: {
        creator_pool_percent: policy.creator_pool_percent,
        reserve_percent: policy.reserve_percent,
        reserve_hold_days: policy.reserve_hold_days,
        min_payout_vnd: policy.min_payout_vnd,
        payout_cycle: policy.payout_cycle
      }
    },
    compliance,
    policyUpdatedAt: policy.updated_at,
    estimate: {
      visible: estimateResult.visible,
      error: estimateResult.error,
      currentMonth,
      settings
    },
    history: {
      reconciledMonths,
      estimateMonthsInHistory,
      estimatesVisible: reconciliationResult.estimatesVisible
    }
  };
}

/** Gross pool helper for tests / future use */
export function estimatePoolFromGross(grossVnd: number, poolPercent: number) {
  return computeCreatorPoolVnd(grossVnd, poolPercent);
}
