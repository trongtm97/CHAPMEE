"use server";

import { getMessagingRestrictionBlockMessage } from "@/lib/messaging/get-active-messaging-restriction";
import { createClient } from "@/lib/data/server";
import type { RestrictionType } from "@/types/moderation";

const MESSAGE_RESTRICTIONS: RestrictionType[] = [
  "message_block_24h",
  "message_block_7d",
  "message_block_30d",
  "message_banned",
  "account_suspended",
  "account_banned"
];

function formatRestrictionDate(endsAt: string | null) {
  if (!endsAt) {
    return null;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(endsAt));
}

export async function getMessageRestrictionMessage(
  userId: string
): Promise<string | null> {
  const messagingRestriction = await getMessagingRestrictionBlockMessage(userId);
  if (messagingRestriction) {
    return messagingRestriction;
  }

  const db = await createClient();
  const now = new Date().toISOString();

  const { data } = await db
    .from("account_restrictions")
    .select("restriction_type, ends_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("restriction_type", MESSAGE_RESTRICTIONS)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("ends_at", { ascending: true, nullsFirst: false })
    .limit(1);

  const row = data?.[0];
  if (!row) {
    return null;
  }

  const formatted = formatRestrictionDate(row.ends_at as string | null);
  if (formatted) {
    return `Tài khoản của bạn đang bị hạn chế nhắn tin đến ${formatted}.`;
  }

  return "Tài khoản của bạn đang bị hạn chế nhắn tin.";
}
