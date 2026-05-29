"use server";

import { revalidatePath } from "next/cache";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/supabase/server";

export async function rejectCommunityPostAction(formData: FormData) {
  const { userId } = await assertStaffAnyPermission([
    "community.post.moderate"
  ]);

  const postId = String(formData.get("community_post_id") ?? "");
  const note = String(formData.get("moderation_note") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ status: "rejected" })
    .eq("id", postId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await createModerationCase({
    actionTaken: "Rejected pending community post",
    moderatorId: userId,
    note,
    targetId: postId,
    targetType: "community_post"
  });

  await logAdminAction({
    actorId: userId,
    action: "remove_content",
    targetType: "community_post",
    targetId: postId,
    metadata: { note: note || null, status: "rejected" }
  });

  revalidatePath("/admin/community");
  revalidatePath("/community");
}
