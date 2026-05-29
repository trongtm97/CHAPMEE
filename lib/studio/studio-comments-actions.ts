"use server";

import { revalidatePath } from "next/cache";
import { hideCommentAsCreator } from "@/lib/comments/hide-comment";
import { pinCommentAsCreator } from "@/lib/comments/pin-comment-studio";
import { replyToCommentAsCreator } from "@/lib/comments/reply-comment";
import { createReportAction } from "@/lib/reports/createReport";
import { createCommunityPostAction } from "@/lib/community/createCommunityPost";
import { studioPath } from "@/lib/studio/constants";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";

export async function studioReplyCommentAction(commentId: string, content: string) {
  return replyToCommentAsCreator(commentId, content);
}

export async function studioPinCommentAction(commentId: string, pinned: boolean) {
  return pinCommentAsCreator(commentId, pinned);
}

export async function studioHideCommentAction(commentId: string) {
  return hideCommentAsCreator(commentId);
}

export async function studioReportCommentAction(commentId: string, reasonCode: string) {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  try {
    await assertCreatorOwnsComment(state.creatorProfile, commentId);
  } catch {
    return { ok: false, error: "Bạn không có quyền báo cáo bình luận này." };
  }

  const formData = new FormData();
  formData.set("target_type", "comment");
  formData.set("target_id", commentId);
  formData.set("reason_code", reasonCode);
  formData.set("return_to", studioPath("/comments"));

  const result = await createReportAction({ error: null, success: null }, formData);

  if (result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(studioPath("/comments"));

  return { ok: true, error: undefined, success: result.success };
}

export async function studioQuickGroupPostAction(input: {
  storyId: string;
  title: string;
  content: string;
}) {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  try {
    await assertCreatorOwnsStory(state.creatorProfile, input.storyId);
  } catch {
    return { ok: false, error: "Bạn không có quyền đăng vào nhóm truyện này." };
  }

  const formData = new FormData();
  formData.set("type", "discussion");
  formData.set("title", input.title.trim());
  formData.set("content", input.content.trim());
  formData.set("story_id", input.storyId);

  const result = await createCommunityPostAction(
    { error: null, success: null },
    formData
  );

  if (result.error) {
    return { ok: false, error: result.error };
  }

  revalidatePath(studioPath("/comments"));
  revalidatePath("/community");

  return { ok: true, success: result.success };
}
