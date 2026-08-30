import type { DatabaseClient } from "@/lib/db/types";

let extendedSchemaCache: boolean | null = null;
let auditTableCache: boolean | null = null;

export function isMissingColumnError(message: string | undefined) {
  if (!message) return false;
  return message.includes("does not exist");
}

export function isMissingTableError(message: string | undefined) {
  if (!message) return false;
  return message.includes("does not exist") && message.includes("relation");
}

/** Probe once whether migration 140 columns exist on notification_campaigns. */
export async function hasExtendedNotificationCampaignSchema(
  db: DatabaseClient
): Promise<boolean> {
  if (extendedSchemaCache !== null) {
    return extendedSchemaCache;
  }

  const { error } = await db.from("notification_campaigns").select("name").limit(1);

  if (error && isMissingColumnError(error.message)) {
    extendedSchemaCache = false;
    return false;
  }

  extendedSchemaCache = true;
  return true;
}

export async function hasNotificationCampaignAuditTable(
  db: DatabaseClient
): Promise<boolean> {
  if (auditTableCache !== null) {
    return auditTableCache;
  }

  const { error } = await db
    .from("notification_campaign_audit_logs")
    .select("id")
    .limit(1);

  if (error && (isMissingTableError(error.message) || isMissingColumnError(error.message))) {
    auditTableCache = false;
    return false;
  }

  auditTableCache = true;
  return true;
}

export function resetNotificationCampaignSchemaCache() {
  extendedSchemaCache = null;
  auditTableCache = null;
}

export function buildCampaignInsertPayload(
  input: Record<string, unknown>,
  extended: boolean
) {
  const base = {
    title: input.title,
    message: input.message,
    notification_type: input.notification_type ?? "system",
    href: input.href ?? null,
    channel_in_app: input.channel_in_app ?? true,
    channel_email: input.channel_email ?? false,
    channel_banner: input.channel_banner ?? false,
    channel_popup: input.channel_popup ?? false,
    target_mode: input.target_mode ?? "segment",
    target_segments: input.target_segments ?? [],
    manual_user_ids: input.manual_user_ids ?? [],
    status: input.status ?? "draft",
    scheduled_at: input.scheduled_at ?? null,
    created_by: input.created_by ?? null,
    estimated_recipient_count: input.estimated_recipient_count ?? 0
  };

  if (!extended) {
    return base;
  }

  return {
    ...base,
    name: input.name ?? input.title,
    priority: input.priority ?? "normal",
    visual_style: input.visual_style ?? "default",
    action_type: input.action_type ?? "none",
    action_target_id: input.action_target_id ?? null,
    expires_at: input.expires_at ?? null,
    updated_by: input.updated_by ?? null,
    metadata_json: input.metadata_json ?? {}
  };
}

export function buildCampaignUpdatePayload(
  input: Record<string, unknown>,
  extended: boolean
) {
  const patch = { ...input };

  if (!extended) {
    delete patch.name;
    delete patch.priority;
    delete patch.visual_style;
    delete patch.action_type;
    delete patch.action_target_id;
    delete patch.expires_at;
    delete patch.updated_by;
    delete patch.archived_at;
    delete patch.metadata_json;
  }

  return patch;
}
