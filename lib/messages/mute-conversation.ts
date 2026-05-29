"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleConversationMute(
  userId: string,
  conversationId: string,
  muted: boolean
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase
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
