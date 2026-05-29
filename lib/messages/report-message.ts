"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MessageReportReasonCode } from "@/types/messages";

export async function reportMessage(input: {
  reporterId: string;
  reportedUserId: string;
  conversationId?: string | null;
  messageRequestId?: string | null;
  messageId?: string | null;
  reasonCode: MessageReportReasonCode;
  detail?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.conversationId && !input.messageRequestId) {
    return { ok: false, error: "Thiếu thông tin báo cáo." };
  }

  const supabase = await createClient();

  if (input.conversationId) {
    const { data: participant } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", input.conversationId)
      .eq("user_id", input.reporterId)
      .maybeSingle();

    if (!participant) {
      return { ok: false, error: "Bạn không có quyền báo cáo cuộc trò chuyện này." };
    }
  }

  if (input.messageId && input.conversationId) {
    const { data: message } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("id", input.messageId)
      .maybeSingle();

    if (!message || message.conversation_id !== input.conversationId) {
      return { ok: false, error: "Tin nhắn không hợp lệ." };
    }
  }

  const { error } = await supabase.from("message_reports").insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    conversation_id: input.conversationId ?? null,
    message_request_id: input.messageRequestId ?? null,
    message_id: input.messageId ?? null,
    reason_code: input.reasonCode,
    detail: input.detail?.trim() || null,
    status: "open"
  });

  if (error) {
    return { ok: false, error: "Không gửi được báo cáo." };
  }

  revalidatePath("/admin/messaging");
  revalidatePath("/admin/moderation/messages");
  return { ok: true };
}
