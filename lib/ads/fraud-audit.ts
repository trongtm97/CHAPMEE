import { createAdminClient } from "@/lib/supabase/admin";

export async function logAdFraudAudit(input: {
  actorId: string | null;
  action: string;
  signalId?: string | null;
  allocationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("ad_fraud_audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      signal_id: input.signalId ?? null,
      allocation_id: input.allocationId ?? null,
      before: input.before ?? null,
      after: input.after ?? null
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Không ghi được audit fraud." };
  }
}
