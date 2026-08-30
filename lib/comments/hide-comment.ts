"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { createClient } from "@/lib/data/server";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";
import { studioPath } from "@/lib/studio/constants";

export type HideCommentResult = {
  ok: boolean;
  error?: string;
};

export async function hideCommentAsCreator(commentId: string): Promise<HideCommentResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  try {
    await assertCreatorOwnsComment(state.creatorProfile, commentId);
  } catch {
    return { ok: false, error: "Bạn không có quyền ẩn bình luận này." };
  }

  const db = await createClient();
  const { error } = await db.rpc("hide_comment_by_story_owner", {
    input_comment_id: commentId
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("hide_comment_by_story_owner")
        ? "Chức năng ẩn bình luận chưa sẵn sàng trên máy chủ. Chạy migration 079."
        : error.message
    };
  }

  const { refreshGroupFeedVisibilityForComment } = await import(
    "@/lib/community-sync/comment-sync"
  );
  void refreshGroupFeedVisibilityForComment(commentId).catch((syncError) => {
    console.error("[community-sync] hide visibility sync failed", syncError);
  });

  revalidatePath(studioPath("/comments"));

  return { ok: true };
}
