"use server";

import { revalidatePath } from "next/cache";
import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";

export async function approveCommunityPostAction(formData: FormData) {
  const { userId } = await assertStaffAnyPermission([
    "community.post.moderate",
    "community.group.approve"
  ]);

  const postId = String(formData.get("community_post_id") ?? "");
  const db = await createClient();
  const { error } = await db
    .from("community_posts")
    .update({ status: "approved" })
    .eq("id", postId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAction({
    actorId: userId,
    action: "community_post_approve",
    targetType: "community_post",
    targetId: postId
  });

  revalidatePath("/admin/community");
  revalidatePath("/community");
}
