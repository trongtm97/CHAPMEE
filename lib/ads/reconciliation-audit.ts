import { createAdminClient } from "@/lib/supabase/admin";

export async function logAdRevenueReconciliationAudit(input: {
  actorId: string | null;
  action: string;
  reconciliationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("ad_revenue_reconciliation_audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      reconciliation_id: input.reconciliationId ?? null,
      before: input.before ?? null,
      after: input.after ?? null
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Không ghi được nhật ký audit đối soát." };
  }
}

export async function listAdRevenueReconciliationAuditLogs(reconciliationId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from("ad_revenue_reconciliation_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (reconciliationId) {
    query = query.eq("reconciliation_id", reconciliationId);
  }
  const { data, error } = await query;
  if (error) return { logs: [], error: error.message };
  return { logs: data ?? [], error: null };
}
