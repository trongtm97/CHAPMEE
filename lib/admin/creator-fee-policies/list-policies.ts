"use server";

import { getSourceRate, mapCreatorFeePolicyRow } from "@/lib/admin/creator-fee-policy-shared";
import { CREATOR_FEE_STATUS_LABELS } from "@/lib/admin/creator-fee-policies/constants";
import { requireCreatorFeeViewAccess } from "@/lib/auth/creator-fee-guards";
import { createClient } from "@/lib/supabase/server";
import type {
  CreatorFeePolicyDashboardFilters,
  CreatorFeePolicyListRow
} from "@/types/admin-creator-fee-policy";
import type { CreatorFeeRevenueSourceId } from "@/types/creator-fee-policy";

function getRateForList(
  policy: ReturnType<typeof mapCreatorFeePolicyRow>,
  sourceId: CreatorFeeRevenueSourceId
) {
  return getSourceRate(policy, sourceId);
}

function matchesSearch(
  row: CreatorFeePolicyListRow,
  search: string,
  creatorIds: Set<string>
) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  const haystack = [
    row.creatorDisplayName,
    row.creatorUsername,
    row.creatorEmail,
    row.studioName,
    row.policyName,
    row.creatorId,
    row.id
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q) || creatorIds.has(row.creatorId);
}

function matchesEffective(
  row: CreatorFeePolicyListRow,
  effective: CreatorFeePolicyDashboardFilters["effective"]
) {
  if (effective === "all") return true;
  const now = Date.now();
  const starts = new Date(row.startsAt).getTime();
  const ends = row.endsAt ? new Date(row.endsAt).getTime() : null;
  if (effective === "currently_effective") {
    return (
      ["active", "scheduled"].includes(row.status) &&
      starts <= now &&
      (ends == null || ends >= now)
    );
  }
  if (effective === "upcoming") {
    return starts > now && ["active", "scheduled", "draft"].includes(row.status);
  }
  if (effective === "past") {
    return (
      row.status === "expired" ||
      row.status === "revoked" ||
      (ends != null && ends < now)
    );
  }
  return true;
}

function sortRows(rows: CreatorFeePolicyListRow[], sort: CreatorFeePolicyDashboardFilters["sort"]) {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "expiring_soon": {
        const aEnd = a.endsAt ? new Date(a.endsAt).getTime() : Infinity;
        const bEnd = b.endsAt ? new Date(b.endsAt).getTime() : Infinity;
        return aEnd - bEnd;
      }
      case "creator_revenue_desc":
        return b.revenue30dVnd - a.revenue30dVnd;
      case "custom_rate_desc": {
        const aRate = a.paidChapterAuthorPercent ?? 0;
        const bRate = b.paidChapterAuthorPercent ?? 0;
        return bRate - aRate;
      }
      case "custom_rate_asc": {
        const aRate = a.paidChapterAuthorPercent ?? 0;
        const bRate = b.paidChapterAuthorPercent ?? 0;
        return aRate - bRate;
      }
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });
  return copy;
}

async function loadRevenue30d(creatorIds: string[]) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const map = new Map<string, number>();
  if (creatorIds.length === 0) return map;

  const { data } = await supabase
    .from("creator_earning_transactions")
    .select("creator_user_id, creator_net_amount_vnd")
    .in("creator_user_id", creatorIds)
    .gte("created_at", since);

  for (const row of data ?? []) {
    const id = row.creator_user_id as string;
    const amt = Number(row.creator_net_amount_vnd) || 0;
    map.set(id, (map.get(id) ?? 0) + amt);
  }
  return map;
}

async function loadProfileLabels(userIds: string[]) {
  const supabase = await createClient();
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds);
  for (const p of data ?? []) {
    map.set(
      p.id as string,
      (p.display_name as string)?.trim() ||
        (p.username as string)?.trim() ||
        (p.id as string).slice(0, 8)
    );
  }
  return map;
}

export async function listCreatorFeePoliciesAction(filters: CreatorFeePolicyDashboardFilters) {
  const guard = await requireCreatorFeeViewAccess();
  if (!guard.ok) {
    return { rows: [] as CreatorFeePolicyListRow[], total: 0, error: guard.error };
  }

  const supabase = await createClient();
  let query = supabase.from("creator_fee_policies").select("*");

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.creatorType !== "all") {
    query = query.eq("creator_type", filters.creatorType);
  }
  if (filters.selectedCreatorId) {
    query = query.eq("creator_id", filters.selectedCreatorId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(500);

  if (error) {
    return { rows: [], total: 0, error: "Không thể tải chính sách phí. Vui lòng thử lại." };
  }

  const policies = (data ?? []).map((row) =>
    mapCreatorFeePolicyRow(row as Record<string, unknown>)
  );

  const creatorIds = Array.from(new Set(policies.map((p) => p.creator_id)));
  const updaterIds = Array.from(
    new Set(policies.map((p) => p.updated_by).filter(Boolean) as string[])
  );

  const [profilesRes, studiosRes, revenueMap, updaterLabels, txCounts] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", creatorIds.length ? creatorIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("creator_monetization_profiles")
      .select("user_id, studio_display_name, monetization_status")
      .in("user_id", creatorIds.length ? creatorIds : ["00000000-0000-0000-0000-000000000000"]),
    loadRevenue30d(creatorIds),
    loadProfileLabels(updaterIds),
    Promise.all(
      policies.map(async (p) => {
        const { count } = await supabase
          .from("creator_earning_transactions")
          .select("id", { count: "exact", head: true })
          .filter("calculation_snapshot->>policy_id", "eq", p.id);
        return { id: p.id, count: count ?? 0 };
      })
    )
  ]);

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, p])
  );
  const studioById = new Map(
    (studiosRes.data ?? []).map((s) => [s.user_id as string, s])
  );
  const txCountById = new Map(txCounts.map((t) => [t.id, t.count]));

  let rows: CreatorFeePolicyListRow[] = policies.map((p) => {
    const profile = profileById.get(p.creator_id);
    const studio = studioById.get(p.creator_id);
    const paid = getRateForList(p, "paid_chapter");
    const tip = getRateForList(p, "tip");
    const vip = getRateForList(p, "vip_subscription");
    const gift = getRateForList(p, "virtual_gift");
    const sponsored = getRateForList(p, "sponsored_challenge");

    return {
      id: p.id,
      creatorId: p.creator_id,
      creatorDisplayName:
        (profile?.display_name as string)?.trim() ||
        (profile?.username as string)?.trim() ||
        p.creator_id.slice(0, 8),
      creatorUsername: (profile?.username as string) ?? null,
      creatorEmail: null,
      creatorAvatarUrl: (profile?.avatar_url as string) ?? null,
      studioName: (studio?.studio_display_name as string) ?? null,
      creatorType: p.creator_type,
      status: p.status,
      policyName: p.policy_name,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      paidChapterAuthorPercent: paid?.author_percent ?? null,
      paidChapterPlatformPercent: paid?.platform_percent ?? null,
      tipAuthorPercent: tip?.author_percent ?? null,
      tipPlatformPercent: tip?.platform_percent ?? null,
      vipAuthorPercent: vip?.author_percent ?? null,
      vipPlatformPercent: vip?.platform_percent ?? null,
      giftAuthorPercent: gift?.author_percent ?? null,
      giftPlatformPercent: gift?.platform_percent ?? null,
      sponsoredAuthorPercent: sponsored?.author_percent ?? null,
      sponsoredPlatformPercent: sponsored?.platform_percent ?? null,
      updatedByLabel: p.updated_by ? updaterLabels.get(p.updated_by) ?? null : null,
      updatedAt: p.updated_at,
      transactionCount: txCountById.get(p.id) ?? 0,
      revenue30dVnd: revenueMap.get(p.creator_id) ?? 0
    };
  });

  if (filters.revenueSource !== "all") {
    rows = rows.filter((row) => {
      const policy = policies.find((p) => p.id === row.id)!;
      const rate = getSourceRate(policy, filters.revenueSource as CreatorFeeRevenueSourceId);
      return rate != null;
    });
  }

  if (filters.search.trim()) {
    const matchedCreatorIds = new Set(
      rows
        .filter((r) => {
          const q = filters.search.trim().toLowerCase();
          return (
            r.creatorId.toLowerCase().includes(q) ||
            r.creatorUsername?.toLowerCase().includes(q) ||
            r.creatorDisplayName.toLowerCase().includes(q)
          );
        })
        .map((r) => r.creatorId)
    );
    rows = rows.filter((r) => matchesSearch(r, filters.search, matchedCreatorIds));
  }

  rows = rows.filter((r) => matchesEffective(r, filters.effective));
  rows = sortRows(rows, filters.sort);

  const total = rows.length;
  const start = (filters.page - 1) * filters.pageSize;
  const paged = rows.slice(start, start + filters.pageSize);

  return { rows: paged, total, error: null };
}

export async function exportCreatorFeePoliciesCsvAction(
  filters: CreatorFeePolicyDashboardFilters
) {
  const { requireCreatorFeeExportAccess } = await import("@/lib/auth/creator-fee-guards");
  const { createAdminAuditLog } = await import("@/lib/admin/create-audit-log");
  const { getCurrentAuthContext } = await import("@/lib/auth/permissions");

  const guard = await requireCreatorFeeExportAccess();
  if (!guard.ok) {
    return { csv: null, error: guard.error };
  }

  const result = await listCreatorFeePoliciesAction({
    ...filters,
    page: 1,
    pageSize: 5000
  });

  if (result.error) {
    return { csv: null, error: result.error };
  }

  const header = [
    "policy_id",
    "creator_id",
    "creator_name",
    "username",
    "studio",
    "status",
    "policy_name",
    "starts_at",
    "ends_at",
    "paid_chapter_author",
    "paid_chapter_platform",
    "tip_author",
    "tip_platform",
    "updated_at"
  ].join(",");

  const lines = result.rows.map((r) =>
    [
      r.id,
      r.creatorId,
      `"${(r.creatorDisplayName ?? "").replace(/"/g, '""')}"`,
      r.creatorUsername ?? "",
      `"${(r.studioName ?? "").replace(/"/g, '""')}"`,
      CREATOR_FEE_STATUS_LABELS[r.status] ?? r.status,
      `"${r.policyName.replace(/"/g, '""')}"`,
      r.startsAt,
      r.endsAt ?? "",
      r.paidChapterAuthorPercent ?? "",
      r.paidChapterPlatformPercent ?? "",
      r.tipAuthorPercent ?? "",
      r.tipPlatformPercent ?? "",
      r.updatedAt
    ].join(",")
  );

  const ctx = await getCurrentAuthContext();
  if (ctx) {
    await createAdminAuditLog({
      action: "creator_fee_policy.export",
      targetType: "creator_fee_policy",
      targetId: "export",
      note: `Exported ${result.rows.length} policies`,
      metadata: { row_count: result.rows.length, filters }
    });
  }

  return { csv: [header, ...lines].join("\n"), error: null };
}
