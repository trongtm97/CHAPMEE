"use server";

import { createAdminClient } from "@/lib/data/admin";
import { getCreatorAdRevenuePolicy } from "@/lib/creator-ad-revenue/policy";
import { getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";

export type AdminAdRevenuePolicyOverview = {
  policy: Awaited<ReturnType<typeof getCreatorAdRevenuePolicy>>;
  eligibleCreators: number;
  fraudHoldCreators: number;
  missingComplianceCreators: number;
  openFraudSignals: number;
  placementsEnabled: number;
  checklist: { id: string; label: string; met: boolean; detail?: string }[];
};

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getAdminAdRevenuePolicyOverview(): Promise<AdminAdRevenuePolicyOverview> {
  const db = createAdminClient();
  const policy = await getCreatorAdRevenuePolicy({ useAdmin: true });
  const estimateSettings = await getAdRevenueEstimateSettings({ useAdmin: true });

  const [profilesRes, fraudRes, placementsRes] = await Promise.all([
    db.from("creator_ad_monetization_profiles").select("status, kyc_status, tax_status, payout_status, fraud_hold, ads_revenue_enabled"),
    db
      .from("ad_fraud_signals")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    db
      .from("ad_placements")
      .select("id", { count: "exact", head: true })
      .eq("is_enabled", true)
      .is("archived_at", null)
  ]);

  const profiles = profilesRes.data ?? [];
  let eligibleCreators = 0;
  let fraudHoldCreators = 0;
  let missingComplianceCreators = 0;

  for (const p of profiles) {
    if (p.status === "eligible" && p.ads_revenue_enabled) eligibleCreators += 1;
    if (p.fraud_hold || p.status === "fraud_hold") fraudHoldCreators += 1;
    if (
      p.kyc_status !== "verified" ||
      p.tax_status !== "verified" ||
      p.payout_status !== "verified"
    ) {
      missingComplianceCreators += 1;
    }
  }

  const monthStats = await db
    .from("ad_monthly_author_stats")
    .select("id", { count: "exact", head: true })
    .eq("month", currentMonthKey());

  const checklist = [
    {
      id: "placements",
      label: "Đã cấu hình placement quảng cáo (có vị trí bật)",
      met: (placementsRes.count ?? 0) > 0,
      detail: `${placementsRes.count ?? 0} placement đang bật`
    },
    {
      id: "tracking",
      label: "Đã có tracking impression/read (bảng thống kê tháng)",
      met: (monthStats.count ?? 0) > 0,
      detail: monthStats.count ? `${monthStats.count} bản ghi tháng hiện tại` : "Chưa có dữ liệu"
    },
    {
      id: "public_policy",
      label: "Đã có chính sách công khai (published)",
      met: policy.policy_status === "published",
      detail: policy.policy_status
    },
    {
      id: "kyc",
      label: "Đã bật điều kiện KYC",
      met: policy.require_kyc
    },
    {
      id: "tax",
      label: "Đã bật điều kiện thuế",
      met: policy.require_tax_info
    },
    {
      id: "reconciliation",
      label: "Đã có quy trình đối soát tháng (module admin)",
      met: true,
      detail: "Xem /admin/ad-revenue-reconciliation"
    },
    {
      id: "fraud",
      label: "Đã có fraud hold / cảnh báo",
      met: policy.invalid_traffic_hold_enabled || policy.auto_hold_invalid_traffic
    },
    {
      id: "audit",
      label: "Đã có audit log",
      met: true
    },
    {
      id: "estimate_visible",
      label: "Hiển thị ước tính cho tác giả (nếu muốn)",
      met:
        policy.show_estimated_revenue_to_creators &&
        estimateSettings.is_estimate_visible_to_creators
    }
  ];

  return {
    policy,
    eligibleCreators,
    fraudHoldCreators,
    missingComplianceCreators,
    openFraudSignals: fraudRes.count ?? 0,
    placementsEnabled: placementsRes.count ?? 0,
    checklist
  };
}
