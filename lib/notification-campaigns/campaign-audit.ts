import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasNotificationCampaignAuditTable
} from "@/lib/notification-campaigns/schema-capabilities";
import type { NotificationCampaignAuditLog } from "@/types/platform-content";

const memoryAuditLogs = new Map<string, NotificationCampaignAuditLog[]>();

function mapAuditRow(row: Record<string, unknown>): NotificationCampaignAuditLog {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    actor_id: row.actor_id ? String(row.actor_id) : null,
    action: String(row.action),
    metadata_json: (row.metadata_json as Record<string, unknown>) ?? {},
    created_at: String(row.created_at)
  };
}

export async function appendNotificationCampaignAuditLog(
  supabase: SupabaseClient,
  input: {
    campaignId: string;
    actorId: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const entry: NotificationCampaignAuditLog = {
    id: crypto.randomUUID(),
    campaign_id: input.campaignId,
    actor_id: input.actorId,
    action: input.action,
    metadata_json: input.metadata ?? {},
    created_at: new Date().toISOString()
  };

  const hasTable = await hasNotificationCampaignAuditTable(supabase);
  if (!hasTable) {
    const existing = memoryAuditLogs.get(input.campaignId) ?? [];
    memoryAuditLogs.set(input.campaignId, [entry, ...existing].slice(0, 200));
    return;
  }

  await supabase.from("notification_campaign_audit_logs").insert({
    campaign_id: input.campaignId,
    actor_id: input.actorId,
    action: input.action,
    metadata_json: input.metadata ?? {}
  });
}

export async function listNotificationCampaignAuditLogs(
  supabase: SupabaseClient,
  campaignId: string,
  limit = 50
): Promise<{ items: NotificationCampaignAuditLog[]; error: string | null }> {
  const hasTable = await hasNotificationCampaignAuditTable(supabase);
  if (!hasTable) {
    return {
      items: (memoryAuditLogs.get(campaignId) ?? []).slice(0, limit),
      error: null
    };
  }

  const { data, error } = await supabase
    .from("notification_campaign_audit_logs")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: error.message };
  }

  return {
    items: (data ?? []).map((row) => mapAuditRow(row as Record<string, unknown>)),
    error: null
  };
}

export function resetMemoryCampaignAuditLogs() {
  memoryAuditLogs.clear();
}
