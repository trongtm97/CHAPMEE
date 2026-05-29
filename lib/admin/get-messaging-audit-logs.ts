"use server";

import { createClient } from "@/lib/supabase/server";
import { sinceForRange } from "@/lib/admin/messaging-date-range";
import type { MessagingDateRange } from "@/types/admin-messaging";

const MESSAGING_ACTIONS = [
  "messaging_report_resolved",
  "messaging_report_rejected",
  "messaging_user_warned",
  "messaging_user_restricted",
  "messaging_restriction_revoked",
  "messaging_link_block_enabled",
  "messaging_keyword_rule_created",
  "messaging_keyword_rule_updated",
  "messaging_safety_settings_updated",
  "messaging_case_viewed",
  "message_moderation"
];

export type MessagingAuditLogRow = {
  id: string;
  action: string;
  actorName: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function getMessagingAuditLogs(input: {
  range: MessagingDateRange;
  limit?: number;
}): Promise<MessagingAuditLogRow[]> {
  const supabase = await createClient();
  const since = sinceForRange(input.range);

  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select(
      `id, action, target_type, target_id, metadata, created_at,
       actor:profiles!admin_audit_logs_actor_id_fkey(display_name, username)`
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 60);

  if (error || !data) {
    return [];
  }

  return data
    .filter((row) => MESSAGING_ACTIONS.includes(row.action as string))
    .map((row) => {
      const actorRaw = row.actor as unknown;
      const actor = (Array.isArray(actorRaw) ? actorRaw[0] : actorRaw) as {
        display_name: string | null;
        username: string | null;
      } | null;

      return {
        id: row.id as string,
        action: row.action as string,
        actorName: actor?.display_name ?? actor?.username ?? "Admin",
        targetType: row.target_type as string | null,
        targetId: row.target_id as string | null,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        createdAt: row.created_at as string
      };
    });
}
