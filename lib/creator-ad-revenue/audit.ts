import { createAdminClient } from "@/lib/supabase/admin";
import type { CreatorAdPolicyAuditLog } from "@/types/creator-ad-revenue-policy";

export async function logCreatorAdPolicyAudit(input: {
  actorId: string | null;
  action: string;
  targetUserId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("creator_ad_policy_audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      target_user_id: input.targetUserId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      note: input.note ?? null
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Không ghi được nhật ký audit." };
  }
}

function mapAuditRow(row: Record<string, unknown>): CreatorAdPolicyAuditLog {
  return {
    id: String(row.id),
    actor_id: (row.actor_id as string | null) ?? null,
    action: String(row.action),
    target_user_id: (row.target_user_id as string | null) ?? null,
    before: (row.before as Record<string, unknown> | null) ?? null,
    after: (row.after as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    note: (row.note as string | null) ?? null
  };
}

export async function listCreatorAdPolicyAuditLogs(options?: {
  limit?: number;
  targetUserId?: string;
  action?: string;
}): Promise<{ logs: CreatorAdPolicyAuditLog[]; error: string | null }> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("creator_ad_policy_audit_logs")
      .select(
        `
        *,
        actor:profiles!creator_ad_policy_audit_logs_actor_id_fkey(username, display_name),
        target:profiles!creator_ad_policy_audit_logs_target_user_id_fkey(username)
      `
      )
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.targetUserId) {
      query = query.eq("target_user_id", options.targetUserId);
    }
    if (options?.action) {
      query = query.eq("action", options.action);
    }

    const { data, error } = await query;
    if (error) {
      return { logs: [], error: error.message };
    }

    const logs = (data ?? []).map((row) => {
      const base = mapAuditRow(row as Record<string, unknown>);
      const actor = (row as { actor?: { username?: string; display_name?: string } }).actor;
      const target = (row as { target?: { username?: string } }).target;
      return {
        ...base,
        actor_username: actor?.username ?? null,
        actor_display_name: actor?.display_name ?? null,
        target_username: target?.username ?? null
      };
    });

    return { logs, error: null };
  } catch {
    return { logs: [], error: "Không tải được nhật ký audit." };
  }
}
