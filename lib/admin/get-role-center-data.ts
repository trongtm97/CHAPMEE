"use server";

import { assertAnyPermission, assertPermission } from "@/lib/auth/require-permission";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { buildUserAdminCapabilities } from "@/lib/admin/user-admin-capabilities";
import {
  ADMIN_ROLE_CODES,
  formatRoleLabel,
  roleHasFinancePermissions,
  roleHasModerationPermissions,
  roleHasUserAdminPermissions,
  ROLE_AUDIT_ACTIONS
} from "@/lib/admin/roles";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminRoleRow,
  RoleAuditLogRow,
  RoleCenterInitialData,
  RoleCenterSummary,
  RoleUserRow
} from "@/types/admin-roles";
import type { RoleCode } from "@/types/permissions";

async function mapAssignerLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[]
) {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", ids);
  for (const row of data ?? []) {
    map.set(row.id, row.display_name ?? row.username ?? row.id);
  }
  return map;
}

export async function getRoleCenterData(): Promise<RoleCenterInitialData> {
  await assertAnyPermission([
    "admin.role.view",
    "admin.user.role.view",
    "admin.settings.view",
    "admin.user.role.assign"
  ]);

  const ctx = await getCurrentAuthContext();
  const capabilities = {
    canAssignRoles: ctx?.permissions.includes("admin.user.role.assign") ?? false,
    canViewAudit: ctx?.permissions.includes("admin.audit.view") ?? false,
    actorRoles: (ctx?.roles ?? []) as RoleCode[]
  };

  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system, created_at")
    .order("code");

  if (error) {
    return {
      roles: [],
      summary: emptySummary(),
      capabilities,
      auditLogs: [],
      error: error.message
    };
  }

  const roleRows: AdminRoleRow[] = [];
  for (const role of roles ?? []) {
    const { data: mappings } = await supabase
      .from("role_permissions")
      .select("permissions(code, name, group_key)")
      .eq("role_id", role.id);

    const permissions = (mappings ?? [])
      .map((row) => {
        const nested = row.permissions as
          | { code: string; name: string; group_key: string | null }
          | { code: string; name: string; group_key: string | null }[]
          | null;
        return Array.isArray(nested) ? nested[0] : nested;
      })
      .filter(Boolean) as AdminRoleRow["permissions"];

    const { count: userCount } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role_id", role.id);

    roleRows.push({
      id: role.id,
      code: role.code as RoleCode,
      name: role.name,
      description: role.description,
      is_system: role.is_system,
      created_at: role.created_at,
      permissions,
      user_count: userCount ?? 0,
      status: "active"
    });
  }

  const summaryData = await computeSummary(roleRows, supabase);
  const auditLogs = capabilities.canViewAudit
    ? await fetchRoleAuditLogs(supabase, { page: 1, pageSize: 50 })
    : { logs: [], total: 0 };

  return {
    roles: roleRows,
    summary: summaryData,
    capabilities,
    auditLogs: auditLogs.logs,
    error: null
  };
}

function emptySummary(): RoleCenterSummary {
  return {
    totalRoles: 0,
    systemRoles: 0,
    financeRoles: 0,
    moderationRoles: 0,
    userAdminRoles: 0,
    adminUsers: 0,
    changes7d: 0,
    emptyPermissionRoles: 0
  };
}

async function computeSummary(
  roles: AdminRoleRow[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<RoleCenterSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: changes7d } = await supabase
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .in("action", [...ROLE_AUDIT_ACTIONS])
    .gte("created_at", sevenDaysAgo);

  const adminRoleIds: string[] = [];
  for (const role of roles) {
    if (ADMIN_ROLE_CODES.includes(role.code)) {
      adminRoleIds.push(role.id);
    }
  }

  let adminUsers = 0;
  if (adminRoleIds.length) {
    const { data: adminUserRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role_id", adminRoleIds);
    adminUsers = new Set((adminUserRows ?? []).map((r) => r.user_id)).size;
  }

  return {
    totalRoles: roles.length,
    systemRoles: roles.filter((r) => r.is_system).length,
    financeRoles: roles.filter((r) => roleHasFinancePermissions(r.permissions)).length,
    moderationRoles: roles.filter((r) => roleHasModerationPermissions(r.permissions))
      .length,
    userAdminRoles: roles.filter((r) => roleHasUserAdminPermissions(r.permissions)).length,
    adminUsers,
    changes7d: changes7d ?? 0,
    emptyPermissionRoles: roles.filter((r) => r.permissions.length === 0).length
  };
}

export async function fetchRoleAuditLogs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: { page?: number; pageSize?: number; roleCode?: string }
): Promise<{ logs: RoleAuditLogRow[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("admin_audit_logs")
    .select("id, action, actor_id, target_id, metadata, created_at", { count: "exact" })
    .in("action", [...ROLE_AUDIT_ACTIONS])
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options.roleCode) {
    query = query.contains("metadata", { role_code: options.roleCode });
  }

  const { data, count, error } = await query;
  if (error) {
    return { logs: [], total: 0 };
  }

  const actorIds = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const targetIds = [...new Set((data ?? []).map((r) => r.target_id).filter(Boolean))] as string[];
  const profileIds = [...new Set([...actorIds, ...targetIds])];
  const labelMap = await mapAssignerLabels(supabase, profileIds);

  const logs: RoleAuditLogRow[] = (data ?? []).map((row) => {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const targetUserId =
      (meta.target_user_id as string | undefined) ?? row.target_id ?? null;
    return {
      id: row.id,
      action: row.action,
      actor_id: row.actor_id,
      actor_label: row.actor_id ? (labelMap.get(row.actor_id) ?? row.actor_id) : null,
      target_user_id: targetUserId,
      target_user_label: targetUserId ? (labelMap.get(targetUserId) ?? targetUserId) : null,
      role_key: (meta.role_code as string | undefined) ?? null,
      permission_key: (meta.permission_key as string | undefined) ?? null,
      reason: (meta.reason as string | undefined) ?? null,
      old_value: (meta.old_value as string | undefined) ?? null,
      new_value: (meta.new_value as string | undefined) ?? null,
      created_at: row.created_at,
      metadata: meta
    };
  });

  return { logs, total: count ?? logs.length };
}

export async function getRoleAuditLogsAction(options?: {
  page?: number;
  pageSize?: number;
  roleCode?: string;
}) {
  await assertPermission("admin.audit.view");
  const supabase = await createClient();
  return fetchRoleAuditLogs(supabase, options ?? {});
}

export async function getUsersByRoleAction(input: {
  roleCode?: RoleCode;
  query?: string;
  status?: string;
  verifiedOnly?: boolean;
  creatorOnly?: boolean;
  restrictedOnly?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{ users: RoleUserRow[]; total: number; page: number; pageSize: number; error: string | null }> {
  await assertAnyPermission([
    "admin.role.view",
    "admin.user.role.view",
    "admin.settings.view",
    "admin.user.role.assign"
  ]);

  const supabase = await createClient();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let roleId: string | null = null;
  if (input.roleCode) {
    const { data: roleRow } = await supabase
      .from("roles")
      .select("id, code, name")
      .eq("code", input.roleCode)
      .maybeSingle();
    if (!roleRow) {
      return { users: [], total: 0, page, pageSize, error: null };
    }
    roleId = roleRow.id;
  }

  let userRoleQuery = supabase
    .from("user_roles")
    .select("user_id, assigned_at, assigned_by, expires_at, roles(code, name)", {
      count: "exact"
    })
    .order("assigned_at", { ascending: false })
    .range(from, to);

  if (roleId) {
    userRoleQuery = userRoleQuery.eq("role_id", roleId);
  }

  const { data: userRoleRows, count, error } = await userRoleQuery;
  if (error) {
    return { users: [], total: 0, page, pageSize, error: error.message };
  }

  const userIds = [...new Set((userRoleRows ?? []).map((r) => r.user_id))];
  if (!userIds.length) {
    return { users: [], total: count ?? 0, page, pageSize, error: null };
  }

  let profileQuery = supabase
    .from("profiles")
    .select("id, username, display_name, status, is_verified, role")
    .in("id", userIds);

  const trimmed = (input.query ?? "").trim();
  if (trimmed) {
    profileQuery = profileQuery.or(
      `username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`
    );
  }
  if (input.status) {
    profileQuery = profileQuery.eq("status", input.status);
  }
  if (input.verifiedOnly) {
    profileQuery = profileQuery.eq("is_verified", true);
  }

  const { data: profiles } = await profileQuery;
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const assignerIds = [
    ...new Set((userRoleRows ?? []).map((r) => r.assigned_by).filter(Boolean))
  ] as string[];
  const assignerMap = await mapAssignerLabels(supabase, assignerIds);

  const creatorIds = new Set<string>();
  if (input.creatorOnly) {
    const { data: creators } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .in("user_id", userIds);
    for (const c of creators ?? []) {
      creatorIds.add(c.user_id);
    }
  }

  const rows: RoleUserRow[] = [];
  for (const ur of userRoleRows ?? []) {
    const profile = profileMap.get(ur.user_id);
    if (!profile) continue;
    if (input.creatorOnly && !creatorIds.has(ur.user_id)) continue;
    if (input.restrictedOnly && profile.status !== "banned") continue;

    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    if (!role) continue;

    rows.push({
      user_id: ur.user_id,
      username: profile.username,
      display_name: profile.display_name,
      email: null,
      status: profile.status ?? "active",
      is_verified: Boolean(profile.is_verified),
      is_creator: creatorIds.has(ur.user_id) || profile.role === "creator",
      role_code: role.code as RoleCode,
      role_name: formatRoleLabel(role.code as RoleCode, role.name),
      assigned_at: ur.assigned_at,
      assigned_by: ur.assigned_by,
      assigned_by_label: ur.assigned_by
        ? (assignerMap.get(ur.assigned_by) ?? ur.assigned_by)
        : null,
      expires_at: ur.expires_at
    });
  }

  return {
    users: rows,
    total: count ?? rows.length,
    page,
    pageSize,
    error: null
  };
}

export async function logRoleCenterViewAction(input: {
  action: "role_permission_viewed" | "role_matrix_viewed";
  roleCode?: string;
}) {
  const ctx = await getCurrentAuthContext();
  if (!ctx) return { ok: false };

  const { logAdminAction } = await import("@/lib/audit/log-admin-action");
  await logAdminAction({
    actorId: ctx.userId,
    action: input.action,
    targetType: "role",
    targetId: input.roleCode ?? null,
    metadata: input.roleCode ? { role_code: input.roleCode } : {}
  });
  return { ok: true };
}

export async function refreshRoleCenterDataAction(): Promise<RoleCenterInitialData> {
  return getRoleCenterData();
}

export async function buildRoleCenterCapabilitiesFromContext() {
  const ctx = await getCurrentAuthContext();
  if (!ctx) {
    return buildUserAdminCapabilities({ permissions: [], roles: [] });
  }
  return buildUserAdminCapabilities({
    permissions: ctx.permissions,
    roles: ctx.roles
  });
}
