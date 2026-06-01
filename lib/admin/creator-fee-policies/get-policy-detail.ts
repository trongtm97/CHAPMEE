"use server";

import { mapCreatorFeePolicyRow } from "@/lib/admin/creator-fee-policy-shared";
import { requireCreatorFeeViewAccess } from "@/lib/auth/creator-fee-guards";
import { buildDefaultSourceRates } from "@/lib/finance/resolve-creator-fee-policy";
import { createClient } from "@/lib/supabase/server";
import type { CreatorFeePolicyDetail } from "@/types/admin-creator-fee-policy";
import type { CreatorFeePolicyAuditEntry } from "@/types/creator-fee-policy";

async function loadCreatorSummary(creatorId: string) {
  const supabase = await createClient();
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString();

  const [profileRes, studioRes, storyCountRes, chapterCountRes, revenueRes, withdrawalRes, verifyRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("id", creatorId)
        .maybeSingle(),
      supabase
        .from("creator_monetization_profiles")
        .select("studio_display_name, monetization_status")
        .eq("user_id", creatorId)
        .maybeSingle(),
      supabase.from("stories").select("id", { count: "exact", head: true }).eq("author_id", creatorId),
      supabase
        .from("episodes")
        .select("id", { count: "exact", head: true })
        .eq("author_id", creatorId),
      supabase
        .from("creator_earning_transactions")
        .select("creator_net_amount_vnd")
        .eq("creator_user_id", creatorId)
        .gte("created_at", since30d),
      supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("creator_user_id", creatorId),
      supabase
        .from("account_verifications")
        .select("status, verification_type")
        .eq("user_id", creatorId)
        .eq("status", "approved")
        .limit(5)
    ]);

  const profile = profileRes.data;
  const revenue30d =
    (revenueRes.data ?? []).reduce(
      (sum, r) => sum + (Number(r.creator_net_amount_vnd) || 0),
      0
    ) ?? 0;

  const verifications = verifyRes.data ?? [];
  const hasBlueTick = verifications.some(
    (v) => v.verification_type === "blue_tick" || v.verification_type === "official"
  );

  const riskWarnings: string[] = [];
  if (studioRes.data?.monetization_status === "restricted") {
    riskWarnings.push("Monetization bị hạn chế");
  }
  if (studioRes.data?.monetization_status === "suspended") {
    riskWarnings.push("Monetization bị tạm ngưng");
  }

  return {
    userId: creatorId,
    displayName:
      (profile?.display_name as string)?.trim() ||
      (profile?.username as string)?.trim() ||
      creatorId.slice(0, 8),
    username: (profile?.username as string) ?? null,
    email: null,
    avatarUrl: (profile?.avatar_url as string) ?? null,
    studioName: (studioRes.data?.studio_display_name as string) ?? null,
    verificationStatus: verifications[0]?.status ?? null,
    hasBlueTick,
    monetizationStatus: (studioRes.data?.monetization_status as string) ?? null,
    storyCount: storyCountRes.count ?? 0,
    chapterCount: chapterCountRes.count ?? 0,
    revenue30dVnd: revenue30d,
    withdrawalCount: withdrawalRes.count ?? 0,
    riskWarnings
  };
}

async function loadPolicyAuditHistory(policyId: string): Promise<CreatorFeePolicyAuditEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_audit_logs")
    .select("id, actor_id, action, target_id, metadata, created_at")
    .eq("target_type", "creator_fee_policy")
    .eq("target_id", policyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const actorIds = Array.from(
    new Set((data ?? []).map((r) => r.actor_id).filter(Boolean) as string[])
  );
  const actorLabels = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      actorLabels.set(
        p.id as string,
        (p.display_name as string)?.trim() || (p.username as string)?.trim() || "Admin"
      );
    }
  }

  return (data ?? []).map((row) => {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    return {
      id: row.id as string,
      action: row.action as string,
      actorUserId: (row.actor_id as string) ?? null,
      actorLabel: row.actor_id ? actorLabels.get(row.actor_id as string) ?? null : null,
      targetCreatorUserId: (meta.creator_id as string) ?? null,
      policyId: row.target_id as string,
      beforeJson: (meta.before as Record<string, unknown>) ?? null,
      afterJson: (meta.after as Record<string, unknown>) ?? null,
      reason: (meta.reason as string) ?? (meta.note as string) ?? null,
      createdAt: row.created_at as string
    };
  });
}

export async function loadCreatorFeePolicyDetailAction(policyId: string) {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return { detail: null, error: guard.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creator_fee_policies")
    .select("*")
    .eq("id", policyId)
    .maybeSingle();

  if (error || !data) {
    return { detail: null, error: "Không tìm thấy chính sách phí." };
  }

  const policy = mapCreatorFeePolicyRow(data as Record<string, unknown>);
  const [creator, defaultRates, auditHistory, listResult] = await Promise.all([
    loadCreatorSummary(policy.creator_id),
    buildDefaultSourceRates(),
    loadPolicyAuditHistory(policyId),
    import("@/lib/admin/creator-fee-policies/list-policies").then((m) =>
      m.listCreatorFeePoliciesAction({
        search: "",
        status: "all",
        creatorType: "all",
        revenueSource: "all",
        effective: "all",
        sort: "newest",
        page: 1,
        pageSize: 1,
        selectedPolicyId: policyId,
        selectedCreatorId: null,
        createMode: false
      })
    )
  ]);

  const listRow = listResult.rows.find((r) => r.id === policyId);
  if (!listRow) {
    return { detail: null, error: "Không thể tải chi tiết chính sách." };
  }

  const detail: CreatorFeePolicyDetail = {
    policyRow: policy,
    policy: {
      ...listRow,
      sourceRates: policy.source_rates,
      note: policy.note,
      publicNote: policy.public_note,
      contractRef: policy.contract_ref,
      showDetailsToCreator: policy.show_details_to_creator,
      createdByLabel: null,
      createdAt: policy.created_at,
      revokedAt: policy.revoked_at,
      revokedReason: policy.revoked_reason
    },
    creator,
    defaultRates,
    auditHistory
  };

  return { detail, error: null };
}
