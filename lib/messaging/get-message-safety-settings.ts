"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { MessageSafetySettings } from "@/types/messaging-safety";

const DEFAULT_SETTINGS: MessageSafetySettings = {
  id: "default",
  enabled: true,
  defaultDmPolicy: "open",
  newAccountDays: 7,
  unverifiedDailyMessageLimit: 5,
  verifiedDailyMessageLimit: 50,
  trustedDailyMessageLimit: 200,
  maxMessagesPerMinute: 20,
  maxMessagesPerDay: 200,
  maxNewRecipientsPerDay: 10,
  duplicateMessageLimitPerDay: 3,
  duplicateCooldownSeconds: 600,
  blockExternalLinksForNewUsers: true,
  blockExternalLinksForUnverified: true,
  allowInternalLinks: true,
  authorProtectionEnabled: true,
  authorDmNewUserLimit: 2,
  autoRestrictReportThreshold: 5,
  updatedAt: new Date().toISOString()
};

function mapRow(row: Record<string, unknown>): MessageSafetySettings {
  return {
    id: row.id as string,
    enabled: row.enabled as boolean,
    defaultDmPolicy: row.default_dm_policy as MessageSafetySettings["defaultDmPolicy"],
    newAccountDays: row.new_account_days as number,
    unverifiedDailyMessageLimit: row.unverified_daily_message_limit as number,
    verifiedDailyMessageLimit: row.verified_daily_message_limit as number,
    trustedDailyMessageLimit: row.trusted_daily_message_limit as number,
    maxMessagesPerMinute: row.max_messages_per_minute as number,
    maxMessagesPerDay: row.max_messages_per_day as number,
    maxNewRecipientsPerDay: row.max_new_recipients_per_day as number,
    duplicateMessageLimitPerDay: row.duplicate_message_limit_per_day as number,
    duplicateCooldownSeconds: row.duplicate_cooldown_seconds as number,
    blockExternalLinksForNewUsers: row.block_external_links_for_new_users as boolean,
    blockExternalLinksForUnverified:
      row.block_external_links_for_unverified as boolean,
    allowInternalLinks: row.allow_internal_links as boolean,
    authorProtectionEnabled: row.author_protection_enabled as boolean,
    authorDmNewUserLimit: row.author_dm_new_user_limit as number,
    autoRestrictReportThreshold: row.auto_restrict_report_threshold as number,
    updatedAt: row.updated_at as string
  };
}

export async function getMessageSafetySettings(): Promise<MessageSafetySettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("message_safety_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      return DEFAULT_SETTINGS;
    }
    return DEFAULT_SETTINGS;
  }

  if (!data) {
    return DEFAULT_SETTINGS;
  }

  return mapRow(data as Record<string, unknown>);
}
