import { createClient } from "@/lib/data/server";
import type { MessagePrivacySettings, MessagePrivacyLevel } from "@/types/messages";

type PrivacyRow = {
  user_id: string;
  who_can_message: MessagePrivacyLevel;
  allow_message_requests: boolean;
  filter_sensitive_messages: boolean;
  block_links_from_strangers: boolean;
  updated_at: string;
};

export const DEFAULT_MESSAGE_PRIVACY: Omit<MessagePrivacySettings, "userId" | "updatedAt"> = {
  whoCanMessage: "followers_only",
  allowMessageRequests: true,
  filterSensitiveMessages: true,
  blockLinksFromStrangers: true
};

function toSettings(row: PrivacyRow): MessagePrivacySettings {
  return {
    userId: row.user_id,
    whoCanMessage: row.who_can_message,
    allowMessageRequests: row.allow_message_requests,
    filterSensitiveMessages: row.filter_sensitive_messages,
    blockLinksFromStrangers: row.block_links_from_strangers,
    updatedAt: row.updated_at
  };
}

export function defaultMessagePrivacyForUser(userId: string): MessagePrivacySettings {
  return {
    userId,
    ...DEFAULT_MESSAGE_PRIVACY,
    updatedAt: new Date().toISOString()
  };
}

export async function getMessagePrivacySettings(
  userId: string
): Promise<MessagePrivacySettings> {
  const db = await createClient();
  const { data, error } = await db
    .from("message_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return defaultMessagePrivacyForUser(userId);
  }

  return toSettings(data as PrivacyRow);
}

export async function ensureMessagePrivacySettings(
  userId: string
): Promise<MessagePrivacySettings> {
  const existing = await getMessagePrivacySettings(userId);
  const db = await createClient();
  const { data } = await db
    .from("message_privacy_settings")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    return existing;
  }

  const { data: inserted, error } = await db
    .from("message_privacy_settings")
    .insert({
      user_id: userId,
      who_can_message: DEFAULT_MESSAGE_PRIVACY.whoCanMessage,
      allow_message_requests: DEFAULT_MESSAGE_PRIVACY.allowMessageRequests,
      filter_sensitive_messages: DEFAULT_MESSAGE_PRIVACY.filterSensitiveMessages,
      block_links_from_strangers: DEFAULT_MESSAGE_PRIVACY.blockLinksFromStrangers
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return existing;
  }

  return toSettings(inserted as PrivacyRow);
}
