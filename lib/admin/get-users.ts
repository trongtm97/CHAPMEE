"use server";

import { assertPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/data/server";
import type { ProfileRole } from "@/lib/auth/getCurrentProfile";
import type { AdminUserListRow, UserDashboardFilters } from "@/types/admin-user";

export type AdminUserRoleRow = {
  code: string;
  name: string;
  assigned_at: string;
  assigned_by: string | null;
  assigned_by_label: string | null;
};

export type AdminUserSearchResult = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: ProfileRole;
  status: string;
  created_at: string;
  roles: AdminUserRoleRow[];
};

export type AdminUserSearchResponse = {
  users: AdminUserSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
};

export async function mapRoleRowsWithAssigners(
  db: Awaited<ReturnType<typeof createClient>>,
  roleRows: Array<{
    assigned_at: string;
    assigned_by: string | null;
    roles:
      | { code: string; name: string }
      | { code: string; name: string }[]
      | null;
  }>
): Promise<AdminUserRoleRow[]> {
  const assignerIds = [
    ...new Set(roleRows.map((row) => row.assigned_by).filter(Boolean))
  ] as string[];

  const assignerLabels = new Map<string, string>();
  if (assignerIds.length) {
    const { data: assigners } = await db
      .from("profiles")
      .select("id, username, display_name")
      .in("id", assignerIds);

    for (const profile of assigners ?? []) {
      assignerLabels.set(
        profile.id,
        profile.display_name ?? profile.username ?? profile.id
      );
    }
  }

  return roleRows
    .map((row) => {
      const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
      if (!role) return null;
      return {
        code: role.code,
        name: role.name,
        assigned_at: row.assigned_at,
        assigned_by: row.assigned_by,
        assigned_by_label: row.assigned_by
          ? (assignerLabels.get(row.assigned_by) ?? row.assigned_by)
          : null
      };
    })
    .filter((row): row is AdminUserRoleRow => Boolean(row));
}

export async function searchAdminUsers(input: {
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserSearchResponse> {
  await assertPermission("admin.user.view");
  const db = await createClient();
  const trimmed = (input.query ?? "").trim();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = db
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, status, created_at, updated_at, is_verified",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (trimmed) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmed)) {
      builder = builder.eq("id", trimmed);
    } else {
      builder = builder.or(
        `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`
      );
    }
  }

  const { data, error, count } = await builder;
  if (error) {
    return { users: [], total: 0, page, pageSize, error: error.message };
  }

  const users = (data ?? []) as Omit<AdminUserSearchResult, "roles">[];
  const enriched: AdminUserSearchResult[] = [];

  for (const user of users) {
    const { data: roleRows } = await db
      .from("user_roles")
      .select("assigned_at, assigned_by, roles(code, name)")
      .eq("user_id", user.id);

    enriched.push({
      ...user,
      status: user.status ?? "active",
      roles: await mapRoleRowsWithAssigners(db, roleRows ?? [])
    });
  }

  return {
    users: enriched,
    total: count ?? enriched.length,
    page,
    pageSize,
    error: null
  };
}

export async function getAdminUserDetail(userId: string) {
  await assertPermission("admin.user.view");
  const db = await createClient();

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, username, display_name, role, status, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { user: null, error: error?.message ?? "Không tìm thấy người dùng." };
  }

  const { data: roleRows } = await db
    .from("user_roles")
    .select("assigned_at, assigned_by, roles(code, name)")
    .eq("user_id", userId);

  const { data: activeBan } = await db
    .from("user_bans")
    .select("id, reason, ends_at, created_at, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    user: {
      id: String(profile.id),
      username: (profile.username as string | null) ?? null,
      display_name: (profile.display_name as string | null) ?? null,
      role: (profile.role as string | null) ?? null,
      status: (profile.status as string | null) ?? "active",
      created_at: String(profile.created_at),
      roles: await mapRoleRowsWithAssigners(db, roleRows ?? []),
      activeBan: activeBan ?? null
    },
    error: null
  };
}

function timeRangeSince(range: UserDashboardFilters["timeRange"]) {
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "7d") {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (range === "30d") {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return null;
}

export async function listAdminUsers(filters: UserDashboardFilters): Promise<{
  users: AdminUserListRow[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}> {
  await assertPermission("admin.user.view");
  const db = await createClient();
  const trimmed = filters.query.trim();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const since = timeRangeSince(filters.timeRange);

  let builder = db
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, role, status, created_at, updated_at, is_verified",
      { count: "exact" }
    );

  if (filters.sort === "recent_activity") {
    builder = builder.order("updated_at", { ascending: false, nullsFirst: false });
  } else {
    builder = builder.order("created_at", { ascending: false });
  }

  builder = builder.range(from, to);

  if (since) {
    builder = builder.gte("created_at", since);
  }

  if (trimmed) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(trimmed)) {
      builder = builder.eq("id", trimmed);
    } else {
      builder = builder.or(
        `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`
      );
    }
  }

  if (filters.role === "creator") {
    builder = builder.eq("role", "creator");
  } else if (filters.role === "verified_creator") {
    builder = builder.eq("is_verified", true);
  } else if (filters.role !== "all") {
    const { data: roleRow } = await db
      .from("roles")
      .select("id")
      .eq("code", filters.role)
      .maybeSingle();
    if (roleRow) {
      const { data: userIds } = await db
        .from("user_roles")
        .select("user_id")
        .eq("role_id", roleRow.id);
      const ids = (userIds ?? []).map((r) => r.user_id as string);
      if (!ids.length) {
        return { users: [], total: 0, page, pageSize, error: null };
      }
      builder = builder.in("id", ids);
    }
  }

  if (filters.status === "active") {
    builder = builder.eq("status", "active");
  } else if (filters.status === "banned") {
    builder = builder.eq("status", "banned");
  } else if (filters.status === "suspended") {
    builder = builder.eq("status", "suspended");
  } else if (filters.status === "verified") {
    builder = builder.eq("is_verified", true);
  } else if (filters.status === "pending_verification") {
    const { data: pending } = await db
      .from("account_verifications")
      .select("user_id")
      .eq("status", "pending");
    const ids = [...new Set((pending ?? []).map((r) => r.user_id as string))];
    if (!ids.length) {
      return { users: [], total: 0, page, pageSize, error: null };
    }
    builder = builder.in("id", ids);
  }

  if (filters.accountType === "has_studio") {
    const { data: creators } = await db.from("creator_profiles").select("user_id");
    const ids = (creators ?? []).map((r) => r.user_id as string);
    if (!ids.length) {
      return { users: [], total: 0, page, pageSize, error: null };
    }
    builder = builder.in("id", ids);
  } else if (filters.accountType === "new_account") {
    builder = builder.gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );
  }

  const { data, error, count } = await builder;
  if (error) {
    return { users: [], total: 0, page, pageSize, error: error.message };
  }

  const rows: AdminUserListRow[] = [];

  for (const user of data ?? []) {
    const userId = user.id as string;
    const [{ data: roleRows }, coinBalance, reportsReceived, strikes, accountRest, msgRest] =
      await Promise.all([
        db
          .from("user_roles")
          .select("assigned_at, assigned_by, roles(code, name)")
          .eq("user_id", userId),
        import("@/lib/coins/get-user-coin-balance").then((m) =>
          m.getUserCoinBalance(userId)
        ),
        db
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("reported_user_id", userId),
        db
          .from("violations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        db
          .from("account_restrictions")
          .select("restriction_type")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(3),
        db
          .from("messaging_restrictions")
          .select("restriction_type")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(3)
      ]);

    const restrictionLabels = [
      ...(accountRest.data ?? []).map((r) => r.restriction_type as string),
      ...(msgRest.data ?? []).map((r) => r.restriction_type as string)
    ];

    rows.push({
      id: userId,
      username: user.username as string | null,
      displayName: user.display_name as string | null,
      avatarUrl: user.avatar_url as string | null,
      email: null,
      profileRole: user.role,
      status: (user.status as string) ?? "active",
      isVerified: Boolean(user.is_verified),
      createdAt: user.created_at as string,
      roles: await mapRoleRowsWithAssigners(db, roleRows ?? []),
      coinTotal: coinBalance.data?.balance ?? 0,
      paidCoin: coinBalance.data?.walletPaid ?? 0,
      bonusCoin: coinBalance.data?.walletBonus ?? 0,
      reportCount: reportsReceived.count ?? 0,
      strikeCount: strikes.count ?? 0,
      activeRestrictionLabels: restrictionLabels,
      lastActivityAt: (user.updated_at as string) ?? null
    });
  }

  if (filters.sort === "most_coins") {
    rows.sort((a, b) => b.coinTotal - a.coinTotal);
  } else if (filters.sort === "most_reports") {
    rows.sort((a, b) => b.reportCount - a.reportCount);
  } else if (filters.sort === "most_strikes") {
    rows.sort((a, b) => b.strikeCount - a.strikeCount);
  }

  return {
    users: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null
  };
}

export async function countUsersWithRole(roleCode: string, excludeUserId?: string) {
  const db = await createClient();
  const { data: roleRow } = await db
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .maybeSingle();

  if (!roleRow) return 0;

  let query = db
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role_id", roleRow.id);

  if (excludeUserId) {
    query = query.neq("user_id", excludeUserId);
  }

  const { count } = await query;
  return count ?? 0;
}
