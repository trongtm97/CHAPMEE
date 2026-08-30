"use server";

import { canUserMessage } from "@/lib/messages/message-permissions";
import { findOrCreateDirectConversation } from "@/lib/messages/create-message-request";

export type OpenDirectConversationResult = {
  ok: boolean;
  error?: string;
  conversationId?: string;
};

export async function openDirectConversation(input: {
  requesterId: string;
  recipientId: string;
}): Promise<OpenDirectConversationResult> {
  if (input.requesterId === input.recipientId) {
    return { ok: false, error: "Không thể nhắn tin cho chính mình." };
  }

  const permission = await canUserMessage(input.requesterId, input.recipientId);
  if (!permission.allowed) {
    return { ok: false, error: permission.reason ?? "Không thể nhắn tin." };
  }

  if (permission.mode !== "direct") {
    return {
      ok: false,
      error: "Hãy gửi yêu cầu nhắn tin để bắt đầu trò chuyện."
    };
  }

  const conversationId = await findOrCreateDirectConversation(
    input.requesterId,
    input.recipientId
  );

  if (!conversationId) {
    return { ok: false, error: "Không tạo được cuộc trò chuyện." };
  }

  return { ok: true, conversationId };
}
