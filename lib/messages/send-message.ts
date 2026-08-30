"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";
import { MESSAGE_SAFETY_WARNING } from "@/lib/moderation/message-safety";
import { runMessageSafetyCheck } from "@/lib/messaging/check-message-safety";
import { logMessageSafetyDecision } from "@/lib/messaging/log-message-safety-decision";
import { getMessagingRestrictionBlockMessage } from "@/lib/messaging/get-active-messaging-restriction";
import { canUserMessage } from "@/lib/messages/message-permissions";
import { getMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";
import { logMessageSafetyEvent } from "@/lib/messages/log-message-safety";
import {
  checkConversationMessageRateLimit,
  checkDuplicateMessage,
  checkGlobalMessageRateLimit
} from "@/lib/messages/message-rate-limit";
import { notifyNewMessage } from "@/lib/notifications/create-message-notification";
import { restoreConversationInboxForRecipients } from "@/lib/messages/restore-conversation-inbox";

const MAX_LENGTH = 1000;

export type SendMessageResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  conversationId?: string;
  messageId?: string;
};

async function updateConversationPreview(
  conversationId: string,
  preview: string
) {
  const db = await createClient();
  const trimmed = preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;
  await db
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: trimmed,
      updated_at: new Date().toISOString(),
      status: "active"
    })
    .eq("id", conversationId);
}

async function areMutualFollowers(userA: string, userB: string): Promise<boolean> {
  const db = await createClient();
  const [{ data: aFollowsB }, { data: bFollowsA }] = await Promise.all([
    db
      .from("user_follows")
      .select("id")
      .eq("follower_id", userA)
      .eq("following_id", userB)
      .maybeSingle(),
    db
      .from("user_follows")
      .select("id")
      .eq("follower_id", userB)
      .eq("following_id", userA)
      .maybeSingle()
  ]);
  return Boolean(aFollowsB && bFollowsA);
}

export async function sendMessage(input: {
  senderId: string;
  conversationId: string;
  body: string;
  forceWarning?: boolean;
  accountCreatedAt?: string;
}): Promise<SendMessageResult> {
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Không thể gửi tin nhắn rỗng." };
  }
  if (body.length > MAX_LENGTH) {
    return { ok: false, error: "Tin nhắn tối đa 1000 ký tự." };
  }

  const restrictionMsg = await getMessagingRestrictionBlockMessage(input.senderId);
  if (restrictionMsg) {
    return { ok: false, error: restrictionMsg };
  }

  const accountAgeHours = input.accountCreatedAt
    ? (Date.now() - new Date(input.accountCreatedAt).getTime()) / (60 * 60 * 1000)
    : 999;

  const convRate = await checkConversationMessageRateLimit(
    input.senderId,
    input.conversationId
  );
  if (!convRate.allowed) {
    return { ok: false, error: convRate.error };
  }

  const globalRate = await checkGlobalMessageRateLimit(
    input.senderId,
    accountAgeHours
  );
  if (!globalRate.allowed) {
    return { ok: false, error: globalRate.error };
  }

  const dup = await checkDuplicateMessage(
    input.senderId,
    input.conversationId,
    body
  );
  if (!dup.allowed) {
    return { ok: false, error: dup.error };
  }

  const db = await createClient();

  const { data: otherParticipant } = await db
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", input.conversationId)
    .neq("user_id", input.senderId)
    .maybeSingle();

  if (!otherParticipant) {
    return { ok: false, error: "Cuộc trò chuyện không hợp lệ." };
  }

  const otherUserId = otherParticipant.user_id as string;
  const mutual = await areMutualFollowers(input.senderId, otherUserId);

  const { data: recipientProfile } = await db
    .from("profiles")
    .select("role")
    .eq("id", otherUserId)
    .maybeSingle();

  const recipientIsAuthor =
    recipientProfile?.role === "creator" ||
    recipientProfile?.role === "admin" ||
    recipientProfile?.role === "moderator";

  const safety = await runMessageSafetyCheck({
    senderId: input.senderId,
    recipientId: otherUserId,
    body,
    conversationId: input.conversationId,
    accountCreatedAt: input.accountCreatedAt,
    areMutualFollowers: mutual,
    recipientIsAuthor,
    isFirstMessage: false,
    isRequest: false
  });

  if (!safety.allowed && safety.decision !== "allowed") {
    await logMessageSafetyEvent({
      userId: input.senderId,
      status: safety.status === "rate_limited" ? "blocked" : safety.status,
      reasons: safety.reasons,
      text: body,
      conversationId: input.conversationId
    });
    await logMessageSafetyDecision({
      senderId: input.senderId,
      recipientId: otherUserId,
      conversationId: input.conversationId,
      decision: safety.decision,
      riskLevel: safety.riskLevel,
      reasonCodes: safety.reasons,
      rawText: body
    });
    return {
      ok: false,
      error: safety.userMessage ?? "Tin nhắn không thể gửi."
    };
  }

  if (safety.status === "warning" && !input.forceWarning) {
    return {
      ok: false,
      warning: MESSAGE_SAFETY_WARNING,
      conversationId: input.conversationId
    };
  }

  const permission = await canUserMessage(input.senderId, otherUserId);
  if (!permission.allowed) {
    return { ok: false, error: permission.reason };
  }

  const recipientPrivacy = await getMessagePrivacySettings(otherUserId);

  const hasLink = body.toLowerCase().includes("http") || body.includes("www.");
  if (recipientPrivacy.blockLinksFromStrangers && hasLink && !mutual) {
    return {
      ok: false,
      error: "Không thể gửi liên kết trong tin nhắn với người lạ."
    };
  }

  const bodySafetyStatus =
    safety.status === "warning" ? "warning" : "clean";

  const { data: message, error } = await db
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body,
      body_safety_status: bodySafetyStatus,
      status: "sent"
    })
    .select("id")
    .single();

  if (error || !message) {
    return { ok: false, error: "Không gửi được tin nhắn. Hãy thử lại." };
  }

  await updateConversationPreview(input.conversationId, body);
  await restoreConversationInboxForRecipients(
    input.conversationId,
    input.senderId
  );

  const { data: senderProfile } = await db
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.senderId)
    .maybeSingle();

  const senderName =
    senderProfile?.display_name ?? senderProfile?.username ?? "Ai đó";

  await notifyNewMessage({
    recipientId: otherUserId,
    senderId: input.senderId,
    senderName,
    conversationId: input.conversationId,
    messagePreview: body,
    bodySafetyStatus
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${input.conversationId}`);

  return {
    ok: true,
    conversationId: input.conversationId,
    messageId: message.id as string
  };
}
