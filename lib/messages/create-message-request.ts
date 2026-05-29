"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MESSAGE_SAFETY_WARNING } from "@/lib/moderation/message-safety";
import { runMessageSafetyCheck } from "@/lib/messaging/check-message-safety";
import { getMessagingRestrictionBlockMessage } from "@/lib/messaging/get-active-messaging-restriction";
import { logMessageSafetyDecision } from "@/lib/messaging/log-message-safety-decision";
import { canUserMessage } from "@/lib/messages/message-permissions";
import { getMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";
import { logMessageSafetyEvent } from "@/lib/messages/log-message-safety";
import {
  checkDuplicateRequestMessage,
  checkMessageRequestRateLimit,
  checkRequestCooldown
} from "@/lib/messages/message-rate-limit";
import { notifyNewMessageRequest } from "@/lib/notifications/create-message-notification";
import { hasTrustedAccountActivity } from "@/lib/messages/has-account-activity";

const MAX_LENGTH = 1000;

export type CreateMessageRequestResult = {
  ok: boolean;
  error?: string;
  warning?: string;
  requestId?: string;
  conversationId?: string;
};

export async function createMessageRequest(input: {
  requesterId: string;
  recipientId: string;
  firstMessage: string;
  accountCreatedAt: string;
  isCreatorOrStaff: boolean;
  forceWarning?: boolean;
}): Promise<CreateMessageRequestResult> {
  const body = input.firstMessage.trim();
  if (!body) {
    return { ok: false, error: "Không thể gửi tin nhắn rỗng." };
  }
  if (body.length > MAX_LENGTH) {
    return { ok: false, error: "Tin nhắn tối đa 1000 ký tự." };
  }

  const accountAgeHours =
    (Date.now() - new Date(input.accountCreatedAt).getTime()) / (60 * 60 * 1000);

  const restrictionMsg = await getMessagingRestrictionBlockMessage(input.requesterId);
  if (restrictionMsg) {
    return { ok: false, error: restrictionMsg };
  }

  const permission = await canUserMessage(input.requesterId, input.recipientId);
  if (!permission.allowed) {
    return { ok: false, error: permission.reason };
  }
  if (permission.mode === "direct") {
    const conversationId = await findOrCreateDirectConversation(
      input.requesterId,
      input.recipientId
    );
    if (!conversationId) {
      return { ok: false, error: "Không tạo được cuộc trò chuyện." };
    }
    const { sendMessage } = await import("@/lib/messages/send-message");
    const sent = await sendMessage({
      senderId: input.requesterId,
      conversationId,
      body,
      forceWarning: input.forceWarning,
      accountCreatedAt: input.accountCreatedAt
    });
    return {
      ok: sent.ok,
      error: sent.error,
      warning: sent.warning,
      conversationId: sent.conversationId,
      requestId: sent.messageId
    };
  }

  const hasTrustedActivity = await hasTrustedAccountActivity(input.requesterId);

  const rate = await checkMessageRequestRateLimit(
    input.requesterId,
    accountAgeHours,
    input.isCreatorOrStaff,
    hasTrustedActivity
  );
  if (!rate.allowed) {
    return { ok: false, error: rate.error };
  }

  const cooldown = await checkRequestCooldown(
    input.requesterId,
    input.recipientId
  );
  if (!cooldown.allowed) {
    return { ok: false, error: cooldown.error };
  }

  const dup = await checkDuplicateRequestMessage(input.requesterId, body);
  if (!dup.allowed) {
    return { ok: false, error: dup.error };
  }

  const recipientPrivacy = await getMessagePrivacySettings(input.recipientId);
  if (!recipientPrivacy.allowMessageRequests) {
    return {
      ok: false,
      error: "Người dùng này chưa mở nhận tin nhắn."
    };
  }

  const supabaseForRole = await createClient();
  const { data: recipientProfile } = await supabaseForRole
    .from("profiles")
    .select("role")
    .eq("id", input.recipientId)
    .maybeSingle();

  const recipientIsAuthor =
    recipientProfile?.role === "creator" ||
    recipientProfile?.role === "admin" ||
    recipientProfile?.role === "moderator";

  const safety = await runMessageSafetyCheck({
    senderId: input.requesterId,
    recipientId: input.recipientId,
    body,
    accountCreatedAt: input.accountCreatedAt,
    recipientIsAuthor,
    isFirstMessage: true,
    isRequest: true,
    areMutualFollowers: false
  });

  if (!safety.allowed && safety.decision !== "allowed") {
    await logMessageSafetyEvent({
      userId: input.requesterId,
      status: safety.status === "rate_limited" ? "blocked" : safety.status,
      reasons: safety.reasons,
      text: body
    });
    await logMessageSafetyDecision({
      senderId: input.requesterId,
      recipientId: input.recipientId,
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
      warning: MESSAGE_SAFETY_WARNING
    };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("message_requests")
    .select("id")
    .eq("requester_id", input.requesterId)
    .eq("recipient_id", input.recipientId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from("message_requests")
      .update({ first_message: body })
      .eq("id", existing.id)
      .eq("requester_id", input.requesterId)
      .eq("status", "pending");

    if (updateError) {
      return { ok: false, error: "Bạn đã gửi yêu cầu tin nhắn." };
    }

    revalidatePath("/messages");
    return { ok: true, requestId: existing.id as string };
  }

  const { data: request, error } = await supabase
    .from("message_requests")
    .insert({
      requester_id: input.requesterId,
      recipient_id: input.recipientId,
      first_message: body,
      status: "pending"
    })
    .select("id")
    .single();

  if (error || !request) {
    return { ok: false, error: "Không gửi được yêu cầu tin nhắn." };
  }

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", input.requesterId)
    .maybeSingle();

  await notifyNewMessageRequest(
    input.recipientId,
    input.requesterId,
    requesterProfile?.display_name ??
      requesterProfile?.username ??
      "Ai đó",
    request.id as string
  );

  revalidatePath("/messages");

  return { ok: true, requestId: request.id as string };
}

export async function findOrCreateDirectConversation(
  userA: string,
  userB: string
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const callerId = authUser.id;
  if (callerId !== userA && callerId !== userB) {
    return null;
  }

  const otherUserId = callerId === userA ? userB : userA;

  const { data: aConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userA);

  const ids = (aConvs ?? []).map((r) => r.conversation_id as string);
  if (ids.length) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userB)
      .in("conversation_id", ids)
      .limit(1);

    if (shared?.[0]?.conversation_id) {
      await supabase
        .from("conversations")
        .update({ status: "active" })
        .eq("id", shared[0].conversation_id as string);
      return shared[0].conversation_id as string;
    }
  }

  const { data: convId, error: rpcError } = await supabase.rpc(
    "create_direct_conversation",
    { other_user_id: otherUserId }
  );

  if (rpcError || !convId) {
    return null;
  }

  return convId as string;
}
