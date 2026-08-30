import { createClient } from "@/lib/data/server";

export async function markConversationRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const db = await createClient();
  await db
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}
