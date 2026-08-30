"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createMessageRequest } from "@/lib/messages/create-message-request";
import { sendMessage } from "@/lib/messages/send-message";
import {
  acceptMessageRequest,
  rejectMessageRequest,
  blockFromMessageRequest
} from "@/lib/messages/respond-message-request";
import { blockUser } from "@/lib/messages/block-user";
import { archiveConversation } from "@/lib/messages/archive-conversation";
import { toggleConversationMute } from "@/lib/messages/mute-conversation";
import { hideConversationForUser } from "@/lib/messages/hide-conversation";
import { unblockUser } from "@/lib/messages/unblock-user";
import { reportMessage } from "@/lib/messages/report-message";
import { markConversationRead } from "@/lib/messages/mark-conversation-read";
import { openDirectConversation } from "@/lib/messages/open-direct-conversation";
import { ensureMessagePrivacySettings } from "@/lib/messages/get-privacy-settings";
import { createClient } from "@/lib/data/server";
import type { MessageActionState } from "@/lib/actions/message-action-state";
import type { MessagePrivacyLevel, MessageReportReasonCode } from "@/types/messages";

async function requireProfile() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) {
    redirect("/login?next=/messages");
  }
  return { user, profile };
}

function isStaffRole(role: string) {
  return role === "admin" || role === "moderator" || role === "founder";
}

export async function startMessageFromProfileAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { user, profile } = await requireProfile();
  const recipientId = String(formData.get("recipientId") ?? "");
  const body = String(formData.get("body") ?? "");
  const forceWarning = formData.get("forceWarning") === "true";
  const returnTo = String(formData.get("returnTo") ?? "/messages");

  const result = await createMessageRequest({
    requesterId: profile.id,
    recipientId,
    firstMessage: body,
    accountCreatedAt: profile.created_at,
    isCreatorOrStaff: isStaffRole(profile.role),
    forceWarning
  });

  if (result.warning) {
    return { error: null, warning: result.warning };
  }
  if (!result.ok) {
    return { error: result.error ?? "Không gửi được tin nhắn.", warning: null };
  }

  if (result.conversationId) {
    redirect(`/messages/${result.conversationId}`);
  }

  if (result.requestId) {
    revalidatePath(returnTo);
    redirect("/messages?tab=requests&sent=1");
  }

  revalidatePath(returnTo);
  redirect("/messages?tab=requests&sent=1");
}

export async function openDirectConversationFromProfileAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { profile } = await requireProfile();
  const recipientId = String(formData.get("recipientId") ?? "").trim();

  if (!recipientId) {
    return { error: "Không xác định được người nhận.", warning: null };
  }

  const result = await openDirectConversation({
    requesterId: profile.id,
    recipientId
  });

  if (!result.ok || !result.conversationId) {
    return {
      error: result.error ?? "Không mở được cuộc trò chuyện.",
      warning: null
    };
  }

  redirect(`/messages/${result.conversationId}`);
}

export async function sendMessageAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { profile } = await requireProfile();
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "");
  const forceWarning = formData.get("forceWarning") === "true";

  const result = await sendMessage({
    senderId: profile.id,
    conversationId,
    body,
    forceWarning,
    accountCreatedAt: profile.created_at
  });

  if (result.warning) {
    return { error: null, warning: result.warning };
  }
  if (!result.ok) {
    return { error: result.error ?? "Không gửi được tin nhắn.", warning: null };
  }

  return {
    error: null,
    warning: null,
    ok: true,
    messageId: result.messageId
  };
}

export async function markConversationReadAction(conversationId: string) {
  const { profile } = await requireProfile();
  await markConversationRead(conversationId, profile.id);
  return { ok: true };
}

export async function acceptRequestAction(requestId: string) {
  const { profile } = await requireProfile();
  const result = await acceptMessageRequest(profile.id, requestId);
  if (result.ok && result.conversationId) {
    redirect(`/messages/${result.conversationId}`);
  }
  return result;
}

export async function rejectRequestAction(requestId: string) {
  const { profile } = await requireProfile();
  return rejectMessageRequest(profile.id, requestId);
}

export async function blockRequestAction(requestId: string) {
  const { profile } = await requireProfile();
  return blockFromMessageRequest(profile.id, requestId);
}

export async function blockUserInChatAction(
  blockedId: string,
  conversationId: string
) {
  const { profile } = await requireProfile();
  const result = await blockUser(profile.id, blockedId);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function unblockUserInChatAction(
  blockedId: string,
  conversationId: string
) {
  const { profile } = await requireProfile();
  const result = await unblockUser(profile.id, blockedId);
  if (!result.ok) {
    return result;
  }
  if (conversationId) {
    revalidatePath(`/messages/${conversationId}`);
  }
  revalidatePath("/messages");
  revalidatePath("/me/settings/messages");
  return { ok: true };
}

export async function unblockUserAction(blockedId: string) {
  const { profile } = await requireProfile();
  const result = await unblockUser(profile.id, blockedId);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/me/settings/messages");
  revalidatePath("/messages");
  return result;
}

export async function archiveConversationAction(conversationId: string) {
  const { profile } = await requireProfile();
  return archiveConversation(profile.id, conversationId);
}

export async function hideConversationAction(conversationId: string) {
  const { profile } = await requireProfile();
  return hideConversationForUser(profile.id, conversationId);
}

export async function toggleMuteAction(conversationId: string, muted: boolean) {
  const { profile } = await requireProfile();
  return toggleConversationMute(profile.id, conversationId, muted);
}

export async function reportMessageRequestAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { profile } = await requireProfile();
  const result = await reportMessage({
    reporterId: profile.id,
    reportedUserId: String(formData.get("reportedUserId") ?? ""),
    messageRequestId: String(formData.get("messageRequestId") ?? ""),
    reasonCode: formData.get("reasonCode") as MessageReportReasonCode,
    detail: (formData.get("detail") as string) || null
  });

  if (!result.ok) {
    return { error: result.error ?? "Không gửi được báo cáo.", warning: null };
  }

  revalidatePath("/messages");
  return { error: null, warning: null, ok: true };
}

export async function reportConversationAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { profile } = await requireProfile();
  const reasonCode = formData.get("reasonCode") as MessageReportReasonCode | null;
  if (!reasonCode) {
    return { error: "Vui lòng chọn lý do báo cáo.", warning: null };
  }

  const result = await reportMessage({
    reporterId: profile.id,
    reportedUserId: String(formData.get("reportedUserId") ?? ""),
    conversationId: String(formData.get("conversationId") ?? ""),
    messageId: (formData.get("messageId") as string) || null,
    reasonCode,
    detail: (formData.get("detail") as string) || null
  });

  if (!result.ok) {
    return { error: result.error ?? "Không gửi được báo cáo.", warning: null };
  }

  return { error: null, warning: null, ok: true };
}

export async function updateMessagePrivacyAction(
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { profile } = await requireProfile();
  await ensureMessagePrivacySettings(profile.id);

  const whoCanMessage = formData.get("whoCanMessage") as MessagePrivacyLevel;
  const allowMessageRequests = formData.get("allowMessageRequests") === "on";
  const filterSensitiveMessages = formData.get("filterSensitiveMessages") === "on";
  const blockLinksFromStrangers = formData.get("blockLinksFromStrangers") === "on";

  const db = await createClient();
  const { error } = await db
    .from("message_privacy_settings")
    .update({
      who_can_message: whoCanMessage,
      allow_message_requests: allowMessageRequests,
      filter_sensitive_messages: filterSensitiveMessages,
      block_links_from_strangers: blockLinksFromStrangers,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", profile.id);

  if (error) {
    return { error: "Không lưu được cài đặt.", warning: null };
  }

  await db
    .from("profile_privacy_settings")
    .update({
      allow_dm: whoCanMessage !== "no_one",
      updated_at: new Date().toISOString()
    })
    .eq("user_id", profile.id);

  revalidatePath("/me/settings/messages");
  revalidatePath("/me/settings/privacy");
  return { error: null, warning: null, ok: true };
}
