"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";

export async function toggleConversationMute(
  userId: string,
  conversationId: string,
  muted: boolean
): Promise<{ ok: boolean }> {
  const db = await createClient();
  const { error } = await db
    .from("conversation_participants")
    .update({ is_muted: muted })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) {
    return { ok: false };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}
