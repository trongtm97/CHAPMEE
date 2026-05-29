"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { MessageSafetyResult } from "@/types/messages";

const PREVIEW_MAX = 200;

export async function logMessageSafetyEvent(input: {
  userId: string;
  status: MessageSafetyResult["status"];
  reasons: string[];
  text: string;
  conversationId?: string | null;
  messageRequestId?: string | null;
}): Promise<void> {
  if (input.status === "clean" || input.status === "warning") {
    return;
  }

  try {
    const supabase = await createClient();
    const preview =
      input.text.trim().length > PREVIEW_MAX
        ? `${input.text.trim().slice(0, PREVIEW_MAX - 1)}…`
        : input.text.trim();

    const { error } = await supabase.from("message_safety_logs").insert({
      user_id: input.userId,
      conversation_id: input.conversationId ?? null,
      message_request_id: input.messageRequestId ?? null,
      text_preview: preview || "(rỗng)",
      status: input.status,
      reasons: input.reasons
    });

    if (error && !isMissingSchemaError(error)) {
      console.error("[message_safety_logs]", error.message);
    }
  } catch {
    /* Không làm crash luồng gửi tin */
  }
}

/**
 * TODO(admin): Hiển thị trên hồ sơ user — số lần bị chặn tin (message_safety_logs),
 * số báo cáo, restriction hiện tại — khi module admin user risk sẵn sàng.
 */
