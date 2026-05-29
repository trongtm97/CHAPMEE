"use server";

import { createClient } from "@/lib/supabase/server";

/** Đưa hội thoại trở lại inbox chính khi có tin mới từ người khác. */
export async function restoreConversationInboxForRecipients(
  conversationId: string,
  senderId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", senderId);

  if (!participants?.length) {
    return;
  }

  for (const row of participants) {
    await supabase
      .from("conversation_participants")
      .update({
        is_archived: false,
        hidden_at: null
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", row.user_id as string);
  }
}
