"use server";

import { revalidatePath } from "next/cache";
import { hideCommentAsCreator } from "@/lib/comments/hide-comment";
import { pinCommentAsCreator } from "@/lib/comments/pin-comment-studio";
import { unhideCommentAsCreator } from "@/lib/comments/unhide-comment";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";
import { studioPath } from "@/lib/studio/constants";

type BulkResult = {
  error?: string;
  failedCount: number;
  ok: boolean;
  successCount: number;
};

function revalidate() {
  revalidatePath(studioPath("/comments"));
}

async function getCreatorProfile() {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile) {
    return { creatorProfile: null, error: "Bạn cần đăng nhập Studio." };
  }

  return { creatorProfile: state.creatorProfile, error: null };
}

export async function bulkPinCommentsAction(
  commentIds: string[],
  pinned: boolean
): Promise<BulkResult> {
  const { creatorProfile, error } = await getCreatorProfile();

  if (!creatorProfile) {
    return {
      error: error ?? undefined,
      failedCount: commentIds.length,
      ok: false,
      successCount: 0
    };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const commentId of commentIds) {
    try {
      await assertCreatorOwnsComment(creatorProfile, commentId);
      const result = await pinCommentAsCreator(commentId, pinned);

      if (result.ok) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số bình luận không ghim được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function bulkHideCommentsAction(
  commentIds: string[]
): Promise<BulkResult> {
  const { creatorProfile, error } = await getCreatorProfile();

  if (!creatorProfile) {
    return {
      error: error ?? undefined,
      failedCount: commentIds.length,
      ok: false,
      successCount: 0
    };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const commentId of commentIds) {
    try {
      await assertCreatorOwnsComment(creatorProfile, commentId);
      const result = await hideCommentAsCreator(commentId);

      if (result.ok) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số bình luận không ẩn được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}

export async function bulkUnhideCommentsAction(
  commentIds: string[]
): Promise<BulkResult> {
  const { creatorProfile, error } = await getCreatorProfile();

  if (!creatorProfile) {
    return {
      error: error ?? undefined,
      failedCount: commentIds.length,
      ok: false,
      successCount: 0
    };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const commentId of commentIds) {
    try {
      await assertCreatorOwnsComment(creatorProfile, commentId);
      const result = await unhideCommentAsCreator(commentId);

      if (result.ok) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    } catch {
      failedCount += 1;
    }
  }

  if (successCount > 0) {
    revalidate();
  }

  return {
    error: failedCount > 0 ? "Một số bình luận không bỏ ẩn được." : undefined,
    failedCount,
    ok: successCount > 0,
    successCount
  };
}
