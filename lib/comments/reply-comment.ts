"use server";

import { revalidatePath } from "next/cache";
import { createCommentRecord } from "@/lib/comments/createComment";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";
import { studioPath } from "@/lib/studio/constants";

export type ReplyCommentResult = {
  ok: boolean;
  error?: string;
};

export async function replyToCommentAsCreator(
  commentId: string,
  content: string
): Promise<ReplyCommentResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  let parent;
  try {
    parent = await assertCreatorOwnsComment(state.creatorProfile, commentId);
  } catch {
    return { ok: false, error: "Bạn không có quyền trả lời bình luận này." };
  }

  if (parent.status === "hidden" || parent.status === "deleted") {
    return { ok: false, error: "Không thể trả lời bình luận đã ẩn hoặc đã xóa." };
  }

  const result = parent.community_post_id
    ? await createCommentRecord({
        content,
        communityPostId: parent.community_post_id,
        parentId: parent.id
      })
    : await createCommentRecord({
        content,
        storyId: parent.story_id ?? undefined,
        episodeId: parent.episode_id,
        parentId: parent.id
      });

  if (result.loginRequired) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  if (result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(studioPath("/comments"));

  if (parent.community_post_id) {
    revalidatePath(`/community/${parent.community_post_id}`);
  }

  return { ok: true };
}
