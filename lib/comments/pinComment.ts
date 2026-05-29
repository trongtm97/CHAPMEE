"use server";

import { assertStaffAnyPermission } from "@/lib/auth/staff-guards";
import { createClient } from "@/lib/supabase/server";
import { awardMilestone } from "@/lib/supabase/milestones";
import { createNotification } from "@/lib/notifications/create-notification";

export async function pinComment(commentId: string, pinned: boolean) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", ok: false, status: 401 };
  }

  try {
    await assertStaffAnyPermission(["comment.pin", "comment.moderate"]);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Forbidden",
      ok: false,
      status: 403
    };
  }

  const { error } = await supabase.rpc("set_comment_pinned", {
    input_comment_id: commentId,
    input_pinned: pinned
  });

  if (error) {
    return {
      error: error.message,
      ok: false,
      status: error.message.includes("set_comment_pinned") ? 501 : 403
    };
  }

  if (pinned) {
    const { data: commentRow } = await supabase
      .from("comments")
      .select("id, user_id, story_id, episode_id, stories(title, creator_id)")
      .eq("id", commentId)
      .maybeSingle();

    const story = Array.isArray(commentRow?.stories)
      ? commentRow.stories[0]
      : commentRow?.stories;

    if (story?.creator_id) {
      const { data: creatorRow } = await supabase
        .from("creator_profiles")
        .select("user_id")
        .eq("id", story.creator_id)
        .maybeSingle();

      if (creatorRow?.user_id) {
        await awardMilestone({
          userId: creatorRow.user_id,
          milestoneKey: "pinned_comment_received",
          relatedAuthorId: story.creator_id,
          metadata: {
            comment_id: commentId,
            story_id: commentRow?.story_id ?? null,
            story_title: story.title ?? null
          }
        });

        if (commentRow?.user_id && commentRow.user_id !== creatorRow.user_id) {
          await createNotification(commentRow.user_id, "comment_pinned_by_author", {
            actorUserId: creatorRow.user_id,
            actionUrl: commentRow.episode_id
              ? `/chapter/${commentRow.episode_id}`
              : commentRow.story_id
                ? "/notifications"
                : "/notifications",
            body: `Tác giả vừa ghim bình luận của bạn trong "${story.title ?? "truyện"}".`,
            dedupeWindowMinutes: 60,
            metadata: {
              comment_id: commentId,
              story_id: commentRow.story_id ?? null
            },
            targetId: commentId,
            targetType: "comment",
            title: "Bình luận của bạn được ghim"
          });
        }
      }
    }
  }

  return { error: null, ok: true, status: 200 };
}
