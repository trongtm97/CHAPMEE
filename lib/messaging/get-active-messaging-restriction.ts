"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { ActiveMessagingRestriction } from "@/lib/messaging/messaging-restriction-helpers";
import type { MessagingRestrictionType } from "@/types/messaging-safety";

const MUTE_TYPES: MessagingRestrictionType[] = [
  "mute_24h",
  "mute_7d",
  "mute_30d",
  "permanent_messaging_ban"
];

export async function getActiveMessagingRestrictions(
  userId: string
): Promise<ActiveMessagingRestriction[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("messaging_restrictions")
    .select("id, restriction_type, reason_code, ends_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    restrictionType: row.restriction_type as MessagingRestrictionType,
    reasonCode: row.reason_code as string,
    endsAt: row.ends_at as string | null
  }));
}

export async function getMessagingRestrictionBlockMessage(
  userId: string
): Promise<string | null> {
  const restrictions = await getActiveMessagingRestrictions(userId);
  if (!restrictions.length) {
    return null;
  }

  const mute = restrictions.find((r) => MUTE_TYPES.includes(r.restrictionType));
  if (mute) {
    if (mute.endsAt) {
      const formatted = new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(mute.endsAt));
      return `Bạn tạm thời không thể gửi tin nhắn do vi phạm quy định nhắn tin. Hạn chế kết thúc sau ${formatted}.`;
    }
    return "Bạn tạm thời không thể gửi tin nhắn do vi phạm quy định nhắn tin.";
  }

  const linkOnly = restrictions.find((r) => r.restrictionType === "link_block_only");
  if (linkOnly) {
    return "Tài khoản của bạn không được gửi liên kết trong tin nhắn.";
  }

  return "Tài khoản của bạn đang bị hạn chế nhắn tin.";
}
