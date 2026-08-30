"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCreatorProfile } from "@/lib/creator/getCurrentCreatorProfile";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/data/server";
import { assertCreatorOwnsComment } from "@/lib/studio/assert-creator-owns-comment";
import { studioPath } from "@/lib/studio/constants";

const MAX_PINNED_PER_TARGET = 3;

export type PinCommentResult = {
  ok: boolean;
  error?: string;
};

export async function pinCommentAsCreator(
  commentId: string,
  pinned: boolean
): Promise<PinCommentResult> {
  const state = await getCurrentCreatorProfile();

  if (!state.creatorProfile || !state.user) {
    return { ok: false, error: "Bạn cần đăng nhập Studio." };
  }

  let owned;
  try {
    owned = await assertCreatorOwnsComment(state.creatorProfile, commentId);
  } catch {
    return { ok: false, error: "Bạn không có quyền ghim bình luận này." };
  }

  if (owned.status !== "visible") {
    return { ok: false, error: "Chỉ ghim được bình luận đang hiển thị." };
  }

  const db = await createClient();

  if (pinned) {
    let countQuery = db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("status", "visible")
      .eq("is_pinned", true)
      .neq("id", commentId);

    if (owned.community_post_id) {
      countQuery = countQuery
        .eq("community_post_id", owned.community_post_id)
        .is("parent_id", null);
    } else {
      countQuery = countQuery
        .eq("story_id", owned.story_id as string)
        .is("community_post_id", null);

      if (owned.episode_id) {
        countQuery = countQuery.eq("episode_id", owned.episode_id);
      } else {
        countQuery = countQuery.is("episode_id", null);
      }
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      return { ok: false, error: countError.message };
    }

    if ((count ?? 0) >= MAX_PINNED_PER_TARGET) {
      return {
        ok: false,
        error: `Mỗi trang chỉ ghim tối đa ${MAX_PINNED_PER_TARGET} bình luận.`
      };
    }
  }

  const { error } = await db.rpc("set_comment_pinned", {
    input_comment_id: commentId,
    input_pinned: pinned
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("set_comment_pinned")
        ? "Chức năng ghim chưa sẵn sàng."
        : error.message
    };
  }

  if (pinned && owned.user_id !== state.user.id) {
    const actionUrl = owned.community_post_id
      ? `/community/${owned.community_post_id}#comments`
      : owned.episode_id
        ? `/chapter/${owned.episode_id}`
        : owned.story_id
          ? `/stories/${owned.story_id}`
          : "/notifications";

    let contextTitle = "truyện";

    if (owned.community_post_id) {
      const { data: postRow } = await db
        .from("community_posts")
        .select("title")
        .eq("id", owned.community_post_id)
        .maybeSingle();

      contextTitle = postRow?.title ?? "bài cộng đồng";
    } else if (owned.story_id) {
      const { data: storyRow } = await db
        .from("stories")
        .select("title")
        .eq("id", owned.story_id)
        .maybeSingle();

      contextTitle = storyRow?.title ?? "truyện";
    }

    await createNotification(owned.user_id, "comment_pinned_by_author", {
      actorUserId: state.user.id,
      actionUrl,
      body: `Tác giả vừa ghim bình luận của bạn trong "${contextTitle}".`,
      dedupeWindowMinutes: 60,
      metadata: {
        comment_id: commentId,
        community_post_id: owned.community_post_id,
        story_id: owned.story_id
      },
      targetId: commentId,
      targetType: "comment",
      title: "Bình luận của bạn được ghim"
    });
  }

  revalidatePath(studioPath("/comments"));

  if (owned.community_post_id) {
    revalidatePath(`/community/${owned.community_post_id}`);
  }

  return { ok: true };
}
