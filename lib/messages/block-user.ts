"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/data/server";
import { archiveConversation } from "@/lib/messages/archive-conversation";

export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  if (blockerId === blockedId) {
    return { ok: false, error: "Không thể chặn chính mình." };
  }

  const db = await createClient();

  const { error } = await db.from("message_blocks").upsert(
    {
      blocker_id: blockerId,
      blocked_id: blockedId,
      reason: reason ?? null
    },
    { onConflict: "blocker_id,blocked_id" }
  );

  if (error) {
    return { ok: false, error: "Không chặn được người dùng." };
  }

  const { data: sharedConvs } = await db
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", blockerId);

  const convIds = (sharedConvs ?? []).map((r) => r.conversation_id as string);
  if (convIds.length) {
    const { data: targetConvs } = await db
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", blockedId)
      .in("conversation_id", convIds);

    for (const row of targetConvs ?? []) {
      await archiveConversation(
        blockerId,
        row.conversation_id as string
      );
    }
  }

  revalidatePath("/messages");
  revalidatePath("/me/settings/messages");
  return { ok: true };
}
