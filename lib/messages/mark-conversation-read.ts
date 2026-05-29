import { createClient } from "@/lib/supabase/server";

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}
