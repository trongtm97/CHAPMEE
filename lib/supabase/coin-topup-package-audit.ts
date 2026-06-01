"use server";

import { createClient } from "@/lib/supabase/server";
import type { CoinTopupPackageAuditLog } from "@/types/topup-package";

export async function insertCoinTopupPackageAuditLog(input: {
  packageId?: string | null;
  actorId: string;
  action: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("coin_topup_package_audit_logs").insert({
    package_id: input.packageId ?? null,
    actor_id: input.actorId,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null
  });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[audit] coin topup package:", error.message);
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function listCoinTopupPackageAuditLogs(
  packageId?: string,
  limit = 20
): Promise<{ data: CoinTopupPackageAuditLog[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("coin_topup_package_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (packageId) {
    query = query.eq("package_id", packageId);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: String(row.id),
      package_id: (row.package_id as string | null) ?? null,
      actor_id: (row.actor_id as string | null) ?? null,
      action: String(row.action),
      old_value: (row.old_value as Record<string, unknown> | null) ?? null,
      new_value: (row.new_value as Record<string, unknown> | null) ?? null,
      created_at: String(row.created_at)
    })),
    error: null
  };
}

export async function countCheckoutSessionsForPack(packId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("checkout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("coin_pack_id", packId);

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}
