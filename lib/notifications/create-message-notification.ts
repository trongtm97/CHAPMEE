"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";

const PREVIEW_MAX = 120;
const MERGE_WINDOW_MINUTES = 5;

function clampPreview(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= PREVIEW_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, PREVIEW_MAX - 1)}…`;
}

function safeMessageBody(preview: string, bodySafetyStatus: string) {
  if (
    bodySafetyStatus === "warning" ||
    bodySafetyStatus === "review" ||
    bodySafetyStatus === "hidden" ||
    bodySafetyStatus === "blocked"
  ) {
    return "Bạn có tin nhắn mới.";
  }
  const clamped = clampPreview(preview);
  return clamped || "Bạn có tin nhắn mới.";
}

async function isBlockedBetween(userA: string, userB: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_message_blocked", {
    p_user_a: userA,
    p_user_b: userB
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}

async function isConversationMuted(
  userId: string,
  conversationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversation_participants")
    .select("is_muted")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data?.is_muted);
}

async function hasRecentMessageNotification(
  recipientId: string,
  conversationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const sinceIso = new Date(
    Date.now() - MERGE_WINDOW_MINUTES * 60_000
  ).toISOString();

  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", recipientId)
    .eq("type", "new_message")
    .eq("target_id", conversationId)
    .gte("created_at", sinceIso)
    .limit(1);

  return (data ?? []).length > 0;
}

export async function canNotifyForMessage(input: {
  recipientId: string;
  senderId: string;
  conversationId?: string;
}): Promise<boolean> {
  if (input.recipientId === input.senderId) {
    return false;
  }

  if (await isBlockedBetween(input.senderId, input.recipientId)) {
    return false;
  }

  if (input.conversationId) {
    if (await isConversationMuted(input.recipientId, input.conversationId)) {
      return false;
    }
  }

  return true;
}

export async function notifyNewMessage(input: {
  recipientId: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  messagePreview: string;
  bodySafetyStatus: string;
}) {
  if (!(await canNotifyForMessage(input))) {
    return null;
  }

  const body = safeMessageBody(input.messagePreview, input.bodySafetyStatus);
  const isMerge = await hasRecentMessageNotification(
    input.recipientId,
    input.conversationId
  );
  const title = isMerge
    ? `${input.senderName} đã gửi tin nhắn mới`
    : `Tin nhắn mới từ ${input.senderName}`;

  return createNotification(input.recipientId, "new_message", {
    title,
    body,
    targetType: "profile",
    targetId: input.conversationId,
    actionUrl: `/messages/${input.conversationId}`,
    actorUserId: input.senderId,
    dedupeWindowMinutes: MERGE_WINDOW_MINUTES,
    mergeMode: "update",
    metadata: {
      context_label: "Tin nhắn",
      sender_id: input.senderId,
      sender_name: input.senderName,
      conversation_id: input.conversationId
    }
  });
}

export async function notifyNewMessageRequest(
  recipientId: string,
  senderId: string,
  senderName: string,
  requestId: string
) {
  if (!(await canNotifyForMessage({ recipientId, senderId }))) {
    return null;
  }

  return createNotification(recipientId, "new_message_request", {
    title: "Yêu cầu nhắn tin mới",
    body: `${senderName} muốn nhắn tin với bạn.`,
    targetType: "profile",
    targetId: requestId,
    actionUrl: "/messages?tab=requests",
    actorUserId: senderId,
    dedupeWindowMinutes: 10,
    mergeMode: "skip",
    metadata: {
      context_label: "Yêu cầu nhắn tin",
      sender_id: senderId,
      sender_name: senderName
    }
  });
}

export async function notifyMessageRequestAccepted(
  requesterId: string,
  recipientId: string,
  _recipientName: string,
  conversationId: string
) {
  if (requesterId === recipientId) {
    return null;
  }

  if (await isBlockedBetween(recipientId, requesterId)) {
    return null;
  }

  return createNotification(requesterId, "message_request_accepted", {
    title: "Yêu cầu nhắn tin",
    body: "Yêu cầu nhắn tin đã được chấp nhận.",
    targetType: "profile",
    targetId: conversationId,
    actionUrl: `/messages/${conversationId}`,
    actorUserId: recipientId,
    dedupeWindowMinutes: 30,
    mergeMode: "skip",
    metadata: {
      context_label: "Tin nhắn",
      conversation_id: conversationId
    }
  });
}

export async function notifyMessageRestriction(
  userId: string,
  endsAt: string | null
) {
  const detail = endsAt
    ? `Hạn chế đến ${new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(endsAt))}.`
    : "";

  const body = detail
    ? `${detail} Vui lòng kiểm tra quy định cộng đồng ChapMee.`
    : "Vui lòng kiểm tra quy định cộng đồng ChapMee.";

  return createNotification(userId, "message_restriction_applied", {
    title: "Tài khoản của bạn đang bị hạn chế nhắn tin",
    body,
    actionUrl: "/me/account-status",
    dedupeWindowMinutes: 60 * 24,
    mergeMode: "skip",
    metadata: {
      context_label: "Tin nhắn"
    }
  });
}

export async function notifyMessageReportResolved(
  reporterId: string,
  outcome: string
) {
  return createNotification(reporterId, "message_report_resolved", {
    title: "Báo cáo tin nhắn đã xử lý",
    body: outcome,
    actionUrl: "/messages",
    dedupeWindowMinutes: 60,
    mergeMode: "skip",
    metadata: {
      context_label: "Tin nhắn"
    }
  });
}
