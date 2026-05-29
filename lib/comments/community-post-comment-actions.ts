"use server";

import { revalidatePath } from "next/cache";
import { createCommentRecord } from "@/lib/comments/createComment";

export async function createCommunityPostCommentAction(
  communityPostId: string,
  content: string
) {
  const result = await createCommentRecord({
    communityPostId,
    content
  });

  if (result.loginRequired) {
    return { ok: false, error: "Bạn cần đăng nhập để bình luận.", loginRequired: true };
  }

  if (result.error) {
    return { ok: false, error: result.error, loginRequired: false };
  }

  revalidatePath(`/community/${communityPostId}`);

  return { ok: true, error: null, loginRequired: false };
}
