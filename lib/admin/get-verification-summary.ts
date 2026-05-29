"use server";

import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import type { VerificationOperationsSummary } from "@/types/admin-verification";

const BLUE_TICK_TYPES = new Set(["blue_tick", "identity_verified"]);

export async function getVerificationSummary(): Promise<VerificationOperationsSummary> {
  await assertAnyPermission(["admin.user.update", "admin.user.view"]);

  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [rowsResult, profilesResult] = await Promise.all([
    supabase
      .from("account_verifications")
      .select("status, verification_type, source, display_badge, created_at, reviewed_at")
      .limit(10000),
    supabase
      .from("profiles")
      .select("id, is_verified, verification_type")
      .eq("is_verified", true)
      .limit(10000)
  ]);

  const rows = rowsResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const summary: VerificationOperationsSummary = {
    pending: 0,
    approved: 0,
    blueTick: 0,
    officialAccount: 0,
    rejected: 0,
    revoked: 0,
    needsReview: 0,
    manualGranted7d: 0
  };

  for (const row of rows) {
    const status = String(row.status);
    if (status === "pending") summary.pending += 1;
    if (status === "approved") summary.approved += 1;
    if (status === "rejected") summary.rejected += 1;
    if (status === "revoked") summary.revoked += 1;
    if (status === "needs_more_info") summary.needsReview += 1;

    if (
      status === "approved" &&
      row.display_badge &&
      BLUE_TICK_TYPES.has(String(row.verification_type))
    ) {
      summary.blueTick += 1;
    }

    if (status === "approved" && row.verification_type === "official_account") {
      summary.officialAccount += 1;
    }

    const createdAt = String(row.created_at ?? row.reviewed_at ?? "");
    if (
      (row.source === "admin_direct" || row.verification_type === "admin_manual") &&
      createdAt >= sevenDaysAgo &&
      status === "approved"
    ) {
      summary.manualGranted7d += 1;
    }
  }

  if (summary.blueTick === 0) {
    summary.blueTick = profiles.filter((p) =>
      BLUE_TICK_TYPES.has(String(p.verification_type))
    ).length;
  }

  if (summary.officialAccount === 0) {
    summary.officialAccount = profiles.filter(
      (p) => p.verification_type === "official_account"
    ).length;
  }

  return summary;
}
