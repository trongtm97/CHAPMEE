"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<{ ok: boolean; error?: string }> {
  if (blockerId === blockedId) {
    return { ok: false, error: "Thao tác không hợp lệ." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("message_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    return { ok: false, error: "Không bỏ chặn được người dùng." };
  }

  revalidatePath("/messages");
  revalidatePath("/me/settings/messages");
  return { ok: true };
}
