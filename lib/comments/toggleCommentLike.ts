"use server";

import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/supabase/server";

export async function toggleCommentLike(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { loginUrl: "/login?next=/reels", ok: false };
  }

  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("target_id", commentId)
    .eq("target_type", "comment")
    .eq("reaction_type", "like")
    .maybeSingle();

  try {
    await assertActionAccess(
      existing ? "reaction.delete.own" : "reaction.create"
    );
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return { loginUrl: null, ok: false, error: error.message };
    }
    throw error;
  }

  if (existing) {
    await supabase
      .from("reactions")
      .delete()
      .eq("user_id", user.id)
      .eq("target_id", commentId)
      .eq("target_type", "comment")
      .eq("reaction_type", "like");
  } else {
    await supabase.from("reactions").upsert(
      {
        user_id: user.id,
        target_id: commentId,
        target_type: "comment",
        reaction_type: "like"
      },
      {
        onConflict: "user_id,target_type,target_id,reaction_type"
      }
    );
  }

  return { loginUrl: null, ok: true };
}
