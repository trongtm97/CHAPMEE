import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSeoChangeLogsTable } from "@/lib/seo/schema-capabilities";
import type { SeoChangeLog } from "@/types/admin-seo";

const memoryLogs: SeoChangeLog[] = [];

export async function appendSeoChangeLog(
  supabase: SupabaseClient,
  input: {
    entityType: string;
    entityId?: string | null;
    action: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changedBy?: string | null;
    reason?: string | null;
  }
): Promise<void> {
  const entry: SeoChangeLog = {
    id: crypto.randomUUID(),
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_json: input.before ?? {},
    after_json: input.after ?? {},
    changed_by: input.changedBy ?? null,
    reason: input.reason ?? null,
    created_at: new Date().toISOString()
  };

  const hasTable = await hasSeoChangeLogsTable(supabase);
  if (!hasTable) {
    memoryLogs.unshift(entry);
    memoryLogs.splice(200);
    return;
  }

  await supabase.from("seo_change_logs").insert({
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_json: input.before ?? {},
    after_json: input.after ?? {},
    changed_by: input.changedBy ?? null,
    reason: input.reason ?? null
  });
}

export async function listSeoChangeLogs(
  supabase: SupabaseClient,
  limit = 50
): Promise<{ items: SeoChangeLog[]; error: string | null }> {
  const hasTable = await hasSeoChangeLogsTable(supabase);
  if (!hasTable) {
    return { items: memoryLogs.slice(0, limit), error: null };
  }

  const { data, error } = await supabase
    .from("seo_change_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { items: [], error: error.message };

  return {
    items: (data ?? []).map((row) => mapChangeLog(row as Record<string, unknown>)),
    error: null
  };
}

function mapChangeLog(row: Record<string, unknown>): SeoChangeLog {
  return {
    id: String(row.id),
    entity_type: String(row.entity_type),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    action: String(row.action),
    before_json: (row.before_json as Record<string, unknown>) ?? {},
    after_json: (row.after_json as Record<string, unknown>) ?? {},
    changed_by: row.changed_by ? String(row.changed_by) : null,
    reason: row.reason ? String(row.reason) : null,
    created_at: String(row.created_at)
  };
}
