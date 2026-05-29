"use server";

import { assertAnyPermission, assertPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export type AdminAuditLogRow = {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
  actor: {
    id: string;
    username: string | null;
    display_name: string | null;
  } | null;
};

export async function getAdminAuditLogs(options?: {
  action?: string;
  actorId?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  await assertPermission("admin.audit.view");

  const supabase = await createClient();
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("admin_audit_logs")
    .select(
      "id, action, target_type, target_id, metadata, created_at, actor_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.action) {
    query = query.eq("action", options.action);
  }
  if (options?.actorId) {
    query = query.eq("actor_id", options.actorId);
  }
  if (options?.targetType) {
    query = query.eq("target_type", options.targetType);
  }
  if (options?.from) {
    query = query.gte("created_at", options.from);
  }
  if (options?.to) {
    query = query.lte("created_at", options.to);
  }

  const { data, error, count } = await query;

  const actorIds = [
    ...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))
  ] as string[];

  const actorMap = new Map<
    string,
    { id: string; username: string | null; display_name: string | null }
  >();

  if (actorIds.length) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);

    for (const actor of actors ?? []) {
      actorMap.set(actor.id, actor);
    }
  }

  const logs: AdminAuditLogRow[] = (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    created_at: row.created_at,
    actor_id: row.actor_id,
    actor: row.actor_id ? (actorMap.get(row.actor_id) ?? null) : null
  }));

  return {
    logs,
    total: count ?? logs.length,
    page,
    pageSize,
    error: error?.message ?? null
  };
}

export async function getRolesWithPermissions() {
  await assertAnyPermission([
    "admin.role.view",
    "admin.user.role.view",
    "admin.settings.view",
    "admin.user.role.assign"
  ]);

  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system")
    .order("code");

  if (error) {
    return { roles: [], error: error.message };
  }

  const result = [];
  for (const role of roles ?? []) {
    const { data: mappings } = await supabase
      .from("role_permissions")
      .select("permissions(code, name, group_key)")
      .eq("role_id", role.id);

    result.push({
      ...role,
      permissions: (mappings ?? [])
        .map((row) => {
          const nested = row.permissions as
            | { code: string; name: string; group_key: string | null }
            | { code: string; name: string; group_key: string | null }[]
            | null;
          return Array.isArray(nested) ? nested[0] : nested;
        })
        .filter(Boolean)
    });
  }

  return { roles: result, error: null };
}
