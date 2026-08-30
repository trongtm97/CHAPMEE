"use server";

import { createClient } from "@/lib/data/server";
import { sinceForRange } from "@/lib/admin/messaging-date-range";
import type {
  MessageSafetyLogItem,
  MessagingDateRange,
  MessagingSafetyReasonFilter,
  MessagingSafetyStatusFilter
} from "@/types/admin-messaging";

const REASON_FILTER_MAP: Record<
  Exclude<MessagingSafetyReasonFilter, "all">,
  string[]
> = {
  spam_link: ["spam_link", "risky_link", "link_first_message", "link_stranger"],
  scam: ["scam", "off_platform"],
  profanity: ["profanity"],
  harassment: ["harassment", "sexual_harassment"],
  external_contact: ["off_platform", "external_contact", "scam"]
};

export async function getMessageSafetyLogs(input: {
  range: MessagingDateRange;
  status: MessagingSafetyStatusFilter;
  reason: MessagingSafetyReasonFilter;
  limit?: number;
}): Promise<MessageSafetyLogItem[]> {
  const db = await createClient();
  const since = sinceForRange(input.range);

  let query = db
    .from("message_safety_logs")
    .select(
      `id, user_id, conversation_id, message_request_id, text_preview, status, reasons, created_at,
       profiles!message_safety_logs_user_id_fkey(display_name, username)`
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 80);

  if (input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const reasonKeys =
    input.reason === "all" ? null : REASON_FILTER_MAP[input.reason];

  return data
    .filter((row) => {
      if (!reasonKeys) return true;
      const reasons = (row.reasons ?? []) as string[];
      return reasons.some((r) => reasonKeys.includes(r));
    })
    .map((row) => {
      const profileRaw = row.profiles as unknown;
      const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as {
        display_name: string | null;
        username: string | null;
      } | null;

      return {
        id: row.id as string,
        userId: row.user_id as string,
        displayName:
          profile?.display_name ?? profile?.username ?? "Người dùng",
        username: profile?.username ?? null,
        conversationId: row.conversation_id as string | null,
        messageRequestId: row.message_request_id as string | null,
        textPreview: row.text_preview as string,
        status: row.status as MessageSafetyLogItem["status"],
        reasons: (row.reasons ?? []) as string[],
        createdAt: row.created_at as string
      };
    });
}
