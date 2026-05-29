"use server";

import { createClient } from "@/lib/supabase/server";

export type CreatorFeeOverrideStats = {
  customRateCreators: number;
  activeFeePolicies: number;
  policiesNeedingReview: number;
};

export async function getCreatorFeeOverrideStats(): Promise<CreatorFeeOverrideStats> {
  const supabase = await createClient();
  const now = new Date();
  const reviewBefore = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [customRes, activePoliciesRes, expiringRes, scheduledRes] = await Promise.all([
    supabase
      .from("creator_monetization_profiles")
      .select("id", { count: "exact", head: true })
      .not("custom_revenue_share", "is", null),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("ends_at", "is", null)
      .lte("ends_at", reviewBefore),
    supabase
      .from("creator_fee_policies")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
  ]);

  return {
    customRateCreators: customRes.count ?? 0,
    activeFeePolicies: activePoliciesRes.count ?? 0,
    policiesNeedingReview:
      (expiringRes.count ?? 0) + (scheduledRes.count ?? 0)
  };
}
