"use server";

import { createClient } from "@/lib/data/server";
import type { CreatorOperationsSummary } from "@/types/admin-creator";

export async function getCreatorOperationsSummary(): Promise<CreatorOperationsSummary> {
  const db = await createClient();

  const [
    totalCreatorsRes,
    activeStudiosRes,
    pendingMonRes,
    approvedMonRes,
    suspendedMonRes,
    pendingVerRes,
    blueTickRes,
    pendingPayoutRes,
    lowQualityRes,
    warnedRes
  ] = await Promise.all([
    db.from("creator_profiles").select("id", { count: "exact", head: true }),
    db
      .from("creator_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    db
      .from("creator_monetization_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review"),
    db
      .from("creator_monetization_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    db
      .from("creator_monetization_profiles")
      .select("id", { count: "exact", head: true })
      .in("status", ["suspended", "permanently_disabled"]),
    db
      .from("account_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", true)
      .not("verification_type", "is", null),
    db
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "under_review"]),
    db
      .from("stories")
      .select("id", { count: "exact", head: true })
      .in("quality_status", ["low_quality_warning_1", "low_quality_warning_2"]),
    db
      .from("content_quality_reviews")
      .select("author_id", { count: "exact", head: true })
      .in("action", ["low_quality_warning_1", "low_quality_warning_2"])
  ]);

  return {
    totalCreators: totalCreatorsRes.count ?? 0,
    activeStudios: activeStudiosRes.count ?? 0,
    pendingMonetization: pendingMonRes.count ?? 0,
    monetizationEnabled: approvedMonRes.count ?? 0,
    monetizationSuspended: suspendedMonRes.count ?? 0,
    pendingVerification: pendingVerRes.count ?? 0,
    blueTick: blueTickRes.count ?? 0,
    pendingPayoutRequests: pendingPayoutRes.count ?? 0,
    lowQualityContent: lowQualityRes.count ?? 0,
    warnedCreators: warnedRes.count ?? 0
  };
}
