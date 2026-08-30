"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";

export async function archiveConversation(
  userId: string,
  conversationId: string
): Promise<{ ok: boolean }> {
  const db = await createClient();
  const { error } = await db
    .from("conversation_participants")
    .update({ is_archived: true })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}
