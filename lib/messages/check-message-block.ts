"use server";

import { createClient } from "@/lib/supabase/server";

export type MessageBlockState = "none" | "blocked_by_me" | "blocked_by_other";

export async function getMessageBlockState(
  viewerId: string,
  otherUserId: string
): Promise<MessageBlockState> {
  if (viewerId === otherUserId) {
    return "none";
  }

  const supabase = await createClient();

  const { data: iBlocked } = await supabase
    .from("message_blocks")
    .select("id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", otherUserId)
    .maybeSingle();

  if (iBlocked) {
    return "blocked_by_me";
  }

  const { data: anyBlock, error } = await supabase.rpc("is_message_blocked", {
    p_user_a: viewerId,
    p_user_b: otherUserId
  });

  if (error) {
    return "none";
  }

  return anyBlock ? "blocked_by_other" : "none";
}

export async function isMessageBlockedBetween(
  userA: string,
  userB: string
): Promise<boolean> {
  const state = await getMessageBlockState(userA, userB);
  return state !== "none";
}
