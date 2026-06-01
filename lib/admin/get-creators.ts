"use server";

import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { summaryCardToFilterPatch } from "@/lib/admin/parse-creator-dashboard-filters";
import type {
  AdminCreatorListRow,
  CreatorDashboardFilters,
  CreatorStudioStatus
} from "@/types/admin-creator";
import type { CreatorMonetizationStatus } from "@/types/creator-monetization";

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function fetchEmailsForUsers(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await Promise.all(
      userIds.slice(0, 50).map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data.user?.email) map.set(id, data.user.email);
      })
    );
  } catch {
    /* admin client optional */
  }
  return map;
}

export async function listAdminCreators(filters: CreatorDashboardFilters): Promise<{
  creators: AdminCreatorListRow[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}> {
  await assertAnyPermission(["admin.settings.view", "admin.settings.update", "admin.user.view"]);

  const effectiveFilters = filters.summaryCard
    ? { ...filters, ...summaryCardToFilterPatch(filters.summaryCard) }
    : filters;

  const supabase = await createClient();
  const trimmed = effectiveFilters.query.trim();
  const page = Math.max(1, effectiveFilters.page);
  const pageSize = Math.min(100, Math.max(1, effectiveFilters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let userIdFilter: string[] | null = null as string[] | null;

  async function intersectIds(next: string[]) {
    if (!next.length) {
      userIdFilter = [] as string[];
      return;
    }
    if (userIdFilter === null) {
      userIdFilter = next;
      return;
    }
    const set = new Set(next);
    userIdFilter = userIdFilter.filter((id) => set.has(id));
  }

  if (effectiveFilters.monetization !== "all") {
    const { data } = await supabase
      .from("creator_monetization_profiles")
      .select("user_id")
      .eq("status", effectiveFilters.monetization);
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  }

  if (effectiveFilters.verification === "pending") {
    const { data } = await supabase
      .from("account_verifications")
      .select("user_id")
      .eq("status", "pending");
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  } else if (effectiveFilters.verification === "verified") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_verified", true);
    await intersectIds((data ?? []).map((r) => r.id as string));
  } else if (effectiveFilters.verification === "blue_tick") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_verified", true)
      .not("verification_type", "is", null);
    await intersectIds((data ?? []).map((r) => r.id as string));
  } else if (effectiveFilters.verification === "unverified") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_verified", false);
    await intersectIds((data ?? []).map((r) => r.id as string));
  } else if (effectiveFilters.verification === "rejected") {
    const { data } = await supabase
      .from("account_verifications")
      .select("user_id")
      .eq("status", "rejected");
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  }

  if (effectiveFilters.finance === "pending_payout") {
    const { data } = await supabase
      .from("payout_requests")
      .select("creator_user_id")
      .in("status", ["requested", "under_review"]);
    await intersectIds([
      ...new Set((data ?? []).map((r) => r.creator_user_id as string))
    ]);
  } else if (effectiveFilters.finance === "payout_disabled") {
    const { data } = await supabase
      .from("creator_monetization_profiles")
      .select("user_id")
      .eq("payout_enabled", false);
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  } else if (effectiveFilters.finance === "has_balance") {
    const { data } = await supabase
      .from("creator_wallets")
      .select("user_id")
      .gt("available_revenue_vnd", 0);
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  } else if (effectiveFilters.finance === "has_revenue") {
    const { data } = await supabase
      .from("creator_wallets")
      .select("user_id")
      .gt("total_earned_vnd", 0);
    await intersectIds((data ?? []).map((r) => r.user_id as string));
  }

  if (userIdFilter && userIdFilter.length === 0) {
    return { creators: [], total: 0, page, pageSize, error: null };
  }

  let builder = supabase
    .from("creator_profiles")
    .select(
      "id, user_id, pen_name, status, created_at, profiles!inner(id, username, display_name, avatar_url, is_verified, verification_label, verification_type, created_at)",
      { count: "exact" }
    );

  if (effectiveFilters.studio === "active") {
    builder = builder.eq("status", "active");
  } else if (effectiveFilters.studio === "suspended") {
    builder = builder.eq("status", "suspended");
  }

  if (userIdFilter) {
    builder = builder.in("user_id", userIdFilter);
  }

  if (trimmed) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmed)) {
      builder = builder.eq("user_id", trimmed);
    } else {
      const { data: profileMatches } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
      const ids = (profileMatches ?? []).map((p) => p.id as string);
      if (!ids.length) {
        return { creators: [], total: 0, page, pageSize, error: null };
      }
      builder = builder.in("user_id", ids);
    }
  }

  if (effectiveFilters.studio === "no_studio") {
    return { creators: [], total: 0, page, pageSize, error: null };
  }

  if (effectiveFilters.sort === "newest") {
    builder = builder.order("created_at", { ascending: false });
  } else if (effectiveFilters.sort === "pending_first") {
    builder = builder.order("updated_at", { ascending: false });
  } else {
    builder = builder.order("created_at", { ascending: false });
  }

  builder = builder.range(from, to);

  const { data, error, count } = await builder;
  if (error) {
    return { creators: [], total: 0, page, pageSize, error: error.message };
  }

  const rows = data ?? [];
  const userIds = rows.map((r) => r.user_id as string);
  const creatorIds = rows.map((r) => r.id as string);

  const [
    monetizationRows,
    walletRows,
    storyCounts,
    chapterCounts,
    qualityRows,
    strikeRows,
    payoutPending,
    emailMap
  ] = await Promise.all([
    userIds.length
      ? supabase
          .from("creator_monetization_profiles")
          .select("id, user_id, status, monetization_enabled, payout_enabled, custom_revenue_share")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("creator_wallets")
          .select("user_id, available_revenue_vnd, total_earned_vnd, pending_revenue_vnd")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("stories").select("creator_id, read_count").in("creator_id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("stories").select("creator_id, episodes(count)").in("creator_id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase
          .from("stories")
          .select("creator_id, quality_status")
          .in("creator_id", creatorIds)
          .neq("quality_status", "good")
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("account_strikes")
          .select("user_id")
          .in("user_id", userIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("payout_requests")
          .select("creator_user_id")
          .in("creator_user_id", userIds)
          .in("status", ["requested", "under_review"])
      : Promise.resolve({ data: [] }),
    fetchEmailsForUsers(userIds)
  ]);

  const monMap = new Map(
    (monetizationRows.data ?? []).map((m) => [m.user_id as string, m])
  );
  const walletMap = new Map(
    (walletRows.data ?? []).map((w) => [w.user_id as string, w])
  );

  const storiesByCreator = new Map<string, { count: number; reads: number }>();
  for (const s of storyCounts.data ?? []) {
    const cid = s.creator_id as string;
    const cur = storiesByCreator.get(cid) ?? { count: 0, reads: 0 };
    cur.count += 1;
    cur.reads += toNumber(s.read_count);
    storiesByCreator.set(cid, cur);
  }

  const chaptersByCreator = new Map<string, number>();
  for (const s of chapterCounts.data ?? []) {
    const cid = s.creator_id as string;
    const ep = s.episodes as { count: number }[] | { count: number };
    const count = Array.isArray(ep) ? (ep[0]?.count ?? 0) : (ep?.count ?? 0);
    chaptersByCreator.set(cid, (chaptersByCreator.get(cid) ?? 0) + count);
  }

  const qualityByCreator = new Map<
    string,
    { warnings: number; hidden: number }
  >();
  for (const s of qualityRows.data ?? []) {
    const cid = s.creator_id as string;
    const cur = qualityByCreator.get(cid) ?? { warnings: 0, hidden: 0 };
    const qs = s.quality_status as string;
    if (qs.includes("warning")) cur.warnings += 1;
    if (qs.includes("hidden") || qs === "permanently_hidden_low_quality") {
      cur.hidden += 1;
    }
    qualityByCreator.set(cid, cur);
  }

  const strikeCountByUser = new Map<string, number>();
  for (const s of strikeRows.data ?? []) {
    const uid = s.user_id as string;
    strikeCountByUser.set(uid, (strikeCountByUser.get(uid) ?? 0) + 1);
  }

  const payoutPendingByUser = new Map<string, number>();
  for (const p of payoutPending.data ?? []) {
    const uid = p.creator_user_id as string;
    payoutPendingByUser.set(uid, (payoutPendingByUser.get(uid) ?? 0) + 1);
  }

  let creators: AdminCreatorListRow[] = rows.map((row) => {
    const profileRaw = row.profiles;
    const profile = (
      Array.isArray(profileRaw) ? profileRaw[0] : profileRaw
    ) as {
      id: string;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      is_verified: boolean;
      verification_label: string | null;
      verification_type: string | null;
    };
    const userId = row.user_id as string;
    const creatorId = row.id as string;
    const mon = monMap.get(userId);
    const wallet = walletMap.get(userId);
    const storyStats = storiesByCreator.get(creatorId) ?? { count: 0, reads: 0 };
    const quality = qualityByCreator.get(creatorId) ?? { warnings: 0, hidden: 0 };

    const studioStatus: CreatorStudioStatus =
      row.status === "suspended" ? "suspended" : "active";

    return {
      userId,
      creatorProfileId: creatorId,
      monetizationProfileId: (mon?.id as string) ?? null,
      displayName: profile.display_name,
      username: profile.username,
      email: emailMap.get(userId) ?? null,
      avatarUrl: profile.avatar_url,
      studioName: resolvePublicDisplayName(profile),
      studioStatus,
      monetizationStatus: (mon?.status as CreatorMonetizationStatus) ?? "none",
      monetizationEnabled: Boolean(mon?.monetization_enabled),
      verificationLabel: profile.verification_label,
      isVerified: Boolean(profile.is_verified),
      hasBlueTick: Boolean(profile.is_verified && profile.verification_type),
      storyCount: storyStats.count,
      chapterCount: chaptersByCreator.get(creatorId) ?? 0,
      totalReads: storyStats.reads,
      netRevenueVnd: toNumber(wallet?.total_earned_vnd),
      availableBalanceVnd: toNumber(wallet?.available_revenue_vnd),
      qualityWarningCount: quality.warnings,
      hiddenStoryCount: quality.hidden,
      appealCount: 0,
      violationCount: strikeCountByUser.get(userId) ?? 0,
      hasActiveWarning: quality.warnings > 0 || (strikeCountByUser.get(userId) ?? 0) > 0,
      payoutEnabled: Boolean(mon?.payout_enabled),
      pendingPayoutCount: payoutPendingByUser.get(userId) ?? 0,
      createdAt: row.created_at as string
    };
  });

  if (effectiveFilters.quality === "warned") {
    creators = creators.filter((c) => c.hasActiveWarning);
  } else if (effectiveFilters.quality === "low_quality") {
    creators = creators.filter((c) => c.qualityWarningCount > 0);
  } else if (effectiveFilters.quality === "hidden") {
    creators = creators.filter((c) => c.hiddenStoryCount > 0);
  } else if (effectiveFilters.quality === "violations") {
    creators = creators.filter((c) => c.violationCount > 0);
  } else if (effectiveFilters.quality === "normal") {
    creators = creators.filter(
      (c) =>
        c.qualityWarningCount === 0 &&
        c.hiddenStoryCount === 0 &&
        c.violationCount === 0
    );
  }

  if (effectiveFilters.sort === "revenue") {
    creators.sort((a, b) => b.netRevenueVnd - a.netRevenueVnd);
  } else if (effectiveFilters.sort === "reads") {
    creators.sort((a, b) => b.totalReads - a.totalReads);
  } else if (effectiveFilters.sort === "stories") {
    creators.sort((a, b) => b.storyCount - a.storyCount);
  } else if (effectiveFilters.sort === "reports") {
    creators.sort((a, b) => b.violationCount - a.violationCount);
  } else if (effectiveFilters.sort === "pending_first") {
    const order: Record<string, number> = {
      pending_review: 0,
      eligible: 1,
      not_eligible: 2,
      approved: 3,
      suspended: 4,
      rejected: 5,
      permanently_disabled: 6,
      none: 7
    };
    creators.sort(
      (a, b) =>
        (order[a.monetizationStatus] ?? 9) - (order[b.monetizationStatus] ?? 9)
    );
  }

  return {
    creators,
    total: count ?? creators.length,
    page,
    pageSize,
    error: null
  };
}
