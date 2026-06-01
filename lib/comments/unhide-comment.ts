"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { createClient } from "@/lib/supabase/server";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";
import { studioPath } from "@/lib/studio/constants";

export type UnhideCommentResult = {
  ok: boolean;
  error?: string;
};

export async function unhideCommentAsCreator(
  commentId: string
): Promise<UnhideCommentResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  try {
    await assertCreatorOwnsComment(state.creatorProfile, commentId);
  } catch {
    return { ok: false, error: "Bạn không có quyền bỏ ẩn bình luận này." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("unhide_comment_by_story_owner", {
    input_comment_id: commentId
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("unhide_comment_by_story_owner")
        ? "Chức năng bỏ ẩn chưa sẵn sàng trên máy chủ. Chạy migration 121."
        : error.message
    };
  }

  revalidatePath(studioPath("/comments"));

  return { ok: true };
}
