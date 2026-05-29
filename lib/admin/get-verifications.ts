"use server";

import { assertAnyPermission } from "@/lib/auth/require-permission";
import { summaryCardToFilterPatch } from "@/lib/admin/parse-verification-filters";
import { createClient } from "@/lib/supabase/server";
import type { VerificationDashboardFilters, VerificationListResult } from "@/types/admin-verification";
import type { AdminVerificationListItem, VerificationType } from "@/types/verification";

const TYPE_ALIASES: Record<string, string[]> = {
  author_verified: ["author_verified", "identity_verified", "notable_author"],
  organization: ["organization", "brand_account"],
  blue_tick: ["blue_tick"],
  official_account: ["official_account"],
  partner: ["partner"],
  admin_manual: ["admin_manual"]
};

type RawRow = {
  id: string;
  user_id: string;
  verification_type: string;
  status: string;
  source: string | null;
  display_badge: boolean;
  public_label: string | null;
  request_reason: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

async function loadEmails(userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length) return map;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await Promise.all(
      userIds.slice(0, 100).map(async (userId) => {
        const { data } = await admin.auth.admin.getUserById(userId);
        if (data.user?.email) map.set(userId, data.user.email);
      })
    );
  } catch {
    /* optional in dev */
  }

  return map;
}

async function loadAuthorUserIds(userIds: string[]) {
  const set = new Set<string>();
  if (!userIds.length) return set;

  const supabase = await createClient();
  const { data } = await supabase
    .from("creator_profiles")
    .select("user_id")
    .in("user_id", userIds);

  for (const row of data ?? []) {
    set.add(String(row.user_id));
  }
  return set;
}

function timeRangeStart(range: VerificationDashboardFilters["timeRange"]) {
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "7d") return new Date(now - 7 * 86400000).toISOString();
  if (range === "30d") return new Date(now - 30 * 86400000).toISOString();
  return null;
}

function matchesQuery(
  row: RawRow,
  profile: ProfileRow | undefined,
  email: string | undefined,
  query: string
) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const haystack = [
    row.id,
    row.user_id,
    profile?.username,
    profile?.display_name,
    email
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function sortRows(
  rows: RawRow[],
  sort: VerificationDashboardFilters["sort"],
  profileMap: Map<string, ProfileRow>,
  authorIds: Set<string>,
  revenueMap: Map<string, number>,
  followerMap: Map<string, number>
) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sort === "pending_longest") {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      const aTime = new Date(a.submitted_at ?? a.created_at).getTime();
      const bTime = new Date(b.submitted_at ?? b.created_at).getTime();
      return aTime - bTime;
    }
    if (sort === "revenue_priority") {
      return (revenueMap.get(b.user_id) ?? 0) - (revenueMap.get(a.user_id) ?? 0);
    }
    if (sort === "follower_priority") {
      return (followerMap.get(b.user_id) ?? 0) - (followerMap.get(a.user_id) ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return copy;
}

function mapItem(
  row: RawRow,
  profile: ProfileRow | undefined,
  email: string | undefined,
  reviewer: ProfileRow | undefined,
  isAuthor: boolean
): AdminVerificationListItem {
  return {
    id: row.id,
    userId: row.user_id,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? null,
    email: email ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    isAuthor,
    verificationType: row.verification_type as VerificationType,
    status: row.status as AdminVerificationListItem["status"],
    source: (row.source ?? "user_request") as AdminVerificationListItem["source"],
    publicBadgeEnabled: Boolean(row.display_badge),
    publicLabel: row.public_label,
    requestReason: row.request_reason,
    adminNote: row.admin_note,
    reviewedById: row.reviewed_by,
    reviewedByName: reviewer?.display_name ?? reviewer?.username ?? null,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  };
}

export async function getVerifications(
  filters: VerificationDashboardFilters
): Promise<VerificationListResult> {
  await assertAnyPermission(["admin.user.update", "admin.user.view"]);

  const effective = filters.summaryCard
    ? { ...filters, ...summaryCardToFilterPatch(filters.summaryCard) }
    : filters;

  const supabase = await createClient();
  const page = Math.max(1, effective.page);
  const pageSize = Math.min(100, Math.max(1, effective.pageSize));

  const { data: rawRows, error } = await supabase
    .from("account_verifications")
    .select(
      "id, user_id, verification_type, status, source, display_badge, public_label, request_reason, admin_note, reviewed_by, submitted_at, reviewed_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getVerifications]", error.message);
    }
    return { items: [], total: 0, page, pageSize, error: "load_failed" };
  }

  let rows = (rawRows ?? []) as RawRow[];

  if (effective.status !== "all") {
    rows = rows.filter((row) => row.status === effective.status);
  }

  if (effective.verificationType !== "all") {
    const allowed = TYPE_ALIASES[effective.verificationType] ?? [effective.verificationType];
    rows = rows.filter((row) => allowed.includes(row.verification_type));
  }

  if (effective.source !== "all") {
    rows = rows.filter((row) => (row.source ?? "user_request") === effective.source);
  }

  const since = timeRangeStart(effective.timeRange);
  if (since) {
    rows = rows.filter((row) => row.created_at >= since);
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const reviewerIds = [
    ...new Set(rows.map((row) => row.reviewed_by).filter(Boolean))
  ] as string[];
  const allProfileIds = [...new Set([...userIds, ...reviewerIds])];

  const [profilesResult, emailMap, authorIds, revenueResult, followerResult] =
    await Promise.all([
      allProfileIds.length
        ? supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", allProfileIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
      loadEmails(userIds),
      loadAuthorUserIds(userIds),
      userIds.length
        ? supabase.from("creator_wallets").select("user_id, total_earned_vnd").in("user_id", userIds)
        : Promise.resolve({ data: [] as { user_id: string; total_earned_vnd: number }[] }),
      userIds.length
        ? supabase
            .from("user_follows")
            .select("following_id")
            .in("following_id", userIds)
        : Promise.resolve({ data: [] as { following_id: string }[] })
    ]);

  const profileMap = new Map<string, ProfileRow>();
  for (const profile of (profilesResult.data ?? []) as ProfileRow[]) {
    profileMap.set(profile.id, profile);
  }

  const revenueMap = new Map<string, number>();
  for (const row of revenueResult.data ?? []) {
    revenueMap.set(String(row.user_id), Number(row.total_earned_vnd) || 0);
  }

  const followerMap = new Map<string, number>();
  for (const row of followerResult.data ?? []) {
    const id = String(row.following_id);
    followerMap.set(id, (followerMap.get(id) ?? 0) + 1);
  }

  if (effective.query.trim()) {
    rows = rows.filter((row) =>
      matchesQuery(row, profileMap.get(row.user_id), emailMap.get(row.user_id), effective.query)
    );
  }

  rows = sortRows(
    rows,
    effective.sort,
    profileMap,
    authorIds,
    revenueMap,
    followerMap
  );

  const total = rows.length;
  const from = (page - 1) * pageSize;
  const pageRows = rows.slice(from, from + pageSize);

  const items = pageRows.map((row) =>
    mapItem(
      row,
      profileMap.get(row.user_id),
      emailMap.get(row.user_id),
      row.reviewed_by ? profileMap.get(row.reviewed_by) : undefined,
      authorIds.has(row.user_id)
    )
  );

  return { items, total, page, pageSize, error: null };
}

/** @deprecated Use getVerifications — kept for compatibility, uses split query. */
export async function getVerificationRequests(
  tab: import("@/types/verification").AdminVerificationTab = "pending"
) {
  const statusMap = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    revoked: "revoked",
    all: "all"
  } as const;

  const result = await getVerifications({
    query: "",
    status: statusMap[tab],
    verificationType: "all",
    source: "all",
    timeRange: "all",
    sort: "newest",
    summaryCard: null,
    page: 1,
    pageSize: 100,
    selectedId: null
  });

  const supabase = await createClient();
  const { data: allRows } = await supabase
    .from("account_verifications")
    .select("status")
    .limit(5000);

  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,
    all: 0
  };

  for (const row of allRows ?? []) {
    counts.all += 1;
    const status = String(row.status) as keyof typeof counts;
    if (status in counts && status !== "all") {
      counts[status] += 1;
    }
  }

  return {
    items: result.items,
    counts,
    error: result.error ? "Không tải được dữ liệu." : null
  };
}
