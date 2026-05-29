"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertOwnsComment } from "@/lib/auth/ownership";
import { createClient } from "@/lib/supabase/server";

export async function deleteCommentAction(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/");
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  try {
    await assertActionAccess("comment.delete.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return;
    }
    throw error;
  }

  let comment: Awaited<ReturnType<typeof assertOwnsComment>>;
  try {
    comment = await assertOwnsComment(commentId, user.id);
  } catch {
    return;
  }

  const { error } = await supabase
    .from("comments")
    .update({ status: "deleted" })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (!error) {
    await trackServerEvent({
      eventName: analyticsEvents.commentDeleted,
      metadata: {
        comment_id: comment.id,
        episode_id: comment.episode_id,
        story_id: comment.story_id,
        target_id: comment.id,
        target_type: "comment"
      },
      targetId: comment.id,
      targetType: "comment"
    });
  }

  revalidatePath(returnTo);
}
