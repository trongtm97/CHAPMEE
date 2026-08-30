"use server";

import { createClient } from "@/lib/data/server";

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const db = await createClient();

  const { data, error } = await db.rpc("get_unread_message_count", {
    p_user_id: userId
  });

  if (error) {
    return 0;
  }

  const count = typeof data === "number" ? data : Number(data);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}
