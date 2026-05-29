"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { sinceForRange } from "@/lib/admin/messaging-date-range";
import type { MessageSafetyDecisionItem } from "@/types/messaging-safety";
import type { MessagingDateRange } from "@/types/admin-messaging";

export async function getMessageSafetyDecisions(input: {
  range: MessagingDateRange | "all";
  decision?: string;
  limit?: number;
}): Promise<MessageSafetyDecisionItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("message_safety_decisions")
    .select(
      `id, message_id, conversation_id, sender_id, recipient_id, decision, risk_level,
       reason_codes, message_excerpt_masked, created_at,
       sender:profiles!message_safety_decisions_sender_id_fkey(display_name, username),
       recipient:profiles!message_safety_decisions_recipient_id_fkey(display_name, username)`
    )
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 80);

  if (input.range !== "all") {
    query = query.gte("created_at", sinceForRange(input.range));
  }

  if (input.decision && input.decision !== "all") {
    query = query.in(
      "decision",
      input.decision === "blocked"
        ? ["blocked", "rate_limited", "needs_review"]
        : [input.decision]
    );
  } else {
    query = query.neq("decision", "allowed");
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  return (data ?? []).map((row) => {
    const senderRaw = row.sender as unknown;
    const sender = (Array.isArray(senderRaw) ? senderRaw[0] : senderRaw) as {
      display_name: string | null;
      username: string | null;
    } | null;
    const recipientRaw = row.recipient as unknown;
    const recipient = (Array.isArray(recipientRaw) ? recipientRaw[0] : recipientRaw) as {
      display_name: string | null;
      username: string | null;
    } | null;

    return {
      id: row.id as string,
      messageId: row.message_id as string | null,
      conversationId: row.conversation_id as string | null,
      senderId: row.sender_id as string,
      senderName:
        sender?.display_name ?? sender?.username ?? "Người gửi",
      senderUsername: sender?.username ?? null,
      recipientId: row.recipient_id as string | null,
      recipientName: recipient
        ? recipient.display_name ?? recipient.username
        : null,
      decision: row.decision as MessageSafetyDecisionItem["decision"],
      riskLevel: row.risk_level as MessageSafetyDecisionItem["riskLevel"],
      reasonCodes: (row.reason_codes ?? []) as string[],
      messageExcerptMasked: row.message_excerpt_masked as string | null,
      createdAt: row.created_at as string
    };
  });
}
