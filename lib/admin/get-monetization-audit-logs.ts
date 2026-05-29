"use server";

import { assertAnyPermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export type MonetizationAuditLogEntry = {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
  actor_label: string;
  changed_keys: string[];
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

export async function getMonetizationAuditLogs(limit = 10) {
  await assertAnyPermission([
    "finance.audit.view",
    "finance.settings.view",
    "admin.audit.view",
    "admin.settings.view"
  ]);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select(
      "id, action, target_type, target_id, metadata, created_at, actor_id, ip_address, user_agent"
    )
    .in("action", ["monetization_settings.update", "update_app_settings"])
    .eq("target_type", "monetization_settings")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { logs: [] as MonetizationAuditLogEntry[], error: error.message };
  }

  const actorIds = [
    ...new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))
  ] as string[];

  const actorMap = new Map<string, string>();
  if (actorIds.length) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", actorIds);
    for (const actor of actors ?? []) {
      const label =
        actor.display_name?.trim() ||
        actor.username?.trim() ||
        actor.id.slice(0, 8);
      actorMap.set(actor.id, label);
    }
  }

  const logs: MonetizationAuditLogEntry[] = (data ?? []).map((row) => {
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    const oldValue =
      (meta.old_value as Record<string, unknown>) ??
      (meta.oldValue as Record<string, unknown>) ??
      null;
    const newValue =
      (meta.new_value as Record<string, unknown>) ??
      (meta.newValue as Record<string, unknown>) ??
      null;
    const changedKeys = Array.isArray(meta.changed_keys)
      ? (meta.changed_keys as string[])
      : Array.isArray(meta.keys)
        ? (meta.keys as string[])
        : [];

    return {
      id: row.id,
      action: row.action,
      created_at: row.created_at,
      actor_id: row.actor_id,
      actor_label: row.actor_id
        ? (actorMap.get(row.actor_id) ?? "Admin")
        : "Hệ thống",
      changed_keys: changedKeys,
      old_value: oldValue,
      new_value: newValue,
      reason: typeof meta.reason === "string" ? meta.reason : null,
      ip_address: row.ip_address ?? null,
      user_agent: row.user_agent ?? null
    };
  });

  return { logs, error: null };
}
