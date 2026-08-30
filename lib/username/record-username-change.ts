"use server";

import { createClient } from "@/lib/data/server";

export async function recordUsernameChange(input: {
  userId: string;
  oldUsername: string | null;
  newUsername: string;
  changedBy?: string | null;
  changeReason?: string | null;
}) {
  if (input.oldUsername === input.newUsername) {
    return { ok: true, error: null };
  }

  const db = await createClient();
  const { error } = await db.from("username_change_history").insert({
    user_id: input.userId,
    old_username: input.oldUsername,
    new_username: input.newUsername,
    changed_by: input.changedBy ?? input.userId,
    change_reason: input.changeReason ?? null
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
