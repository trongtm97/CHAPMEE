"use server";

import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { maskMessageExcerpt } from "@/lib/messaging/mask-message-excerpt";
import type {
  MessageSafetyDecisionType,
  MessageSafetyRiskLevel
} from "@/types/messaging-safety";

export async function logMessageSafetyDecision(input: {
  senderId: string;
  recipientId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  decision: MessageSafetyDecisionType;
  riskLevel?: MessageSafetyRiskLevel;
  reasonCodes: string[];
  matchedRules?: Record<string, unknown> | null;
  rawText?: string;
}): Promise<void> {
  if (input.decision === "allowed") {
    return;
  }

  try {
    const db = await createClient();
    const excerpt = input.rawText
      ? maskMessageExcerpt(input.rawText)
      : null;

    const { error } = await db.from("message_safety_decisions").insert({
      sender_id: input.senderId,
      recipient_id: input.recipientId ?? null,
      conversation_id: input.conversationId ?? null,
      message_id: input.messageId ?? null,
      decision: input.decision,
      risk_level: input.riskLevel ?? "medium",
      reason_codes: input.reasonCodes,
      matched_rules: input.matchedRules ?? null,
      message_excerpt_masked: excerpt
    });

    if (error && !isMissingSchemaError(error) && process.env.NODE_ENV === "development") {
      console.warn("[message_safety_decisions]", error.message);
    }
  } catch {
    /* không crash luồng gửi tin */
  }
}
