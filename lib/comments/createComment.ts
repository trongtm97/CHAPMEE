"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSiteOrigin } from "@/lib/brand/site-origin";
import { analyticsEvents } from "@/lib/analytics/events";
import { detectPotentialSpamContent } from "@/lib/moderation/spam-heuristics";
import { enforceRateLimit } from "@/lib/rate-limit";
import { awardMilestone, buildMilestoneToastNotice } from "@/lib/data/milestones";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { createNotification } from "@/lib/notifications/create-notification";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { assertNotRestricted } from "@/lib/moderation/check-restriction";
import { createClient } from "@/lib/data/server";
import { SYNC_SURFACES, type SyncSurface } from "@/lib/community-sync/constants";
import type { ReelsCommentSyncContext } from "@/lib/community-sync/adapters/types";
import { saveCommentContentObject } from "@/lib/storage/comments-content-storage";

export type CommentFormState = {
  error: string | null;
};

type CreateCommentInput = {
  content: string;
  episodeId?: string | null;
  parentId?: string | null;
  storyId?: string | null;
  communityPostId?: string | null;
  syncSurface?: SyncSurface;
  reelsSync?: ReelsCommentSyncContext;
};

type CreateCommentResult = {
  commentId: string | null;
  error: string | null;
  loginRequired: boolean;
  milestoneNotice: {
    title: string;
    description: string;
    href: string;
  } | null;
};

export async function createCommentRecord(
  input: CreateCommentInput
): Promise<CreateCommentResult> {
  const content = input.content.trim();

  if (!content) {
    return {
      commentId: null,
      error: "Comment cannot be empty.",
      loginRequired: false,
      milestoneNotice: null
    };
  }

  if (content.length > 500) {
    return {
      commentId: null,
      error: "Comment must be 500 characters or fewer.",
      loginRequired: false,
      milestoneNotice: null
    };
  }

  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    return {
      commentId: null,
      error: null,
      loginRequired: true,
      milestoneNotice: null
    };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return {
        commentId: null,
        error: error.message,
        loginRequired: false,
        milestoneNotice: null
      };
    }
    throw error;
  }

  const commentRestriction = await assertNotRestricted(
    user.id,
    "comment_block",
    "Bạn đang bị hạn chế bình luận. Xem /me/account-status."
  );
  if (!commentRestriction.ok) {
    return {
      commentId: null,
      error: commentRestriction.error,
      loginRequired: false,
      milestoneNotice: null
    };
  }

  const isCommunityPost = Boolean(input.communityPostId);
  const isStoryComment = Boolean(input.storyId);

  if (isCommunityPost === isStoryComment) {
    return {
      commentId: null,
      error: "Thiếu ngữ cảnh bình luận.",
      loginRequired: false,
      milestoneNotice: null
    };
  }

  if (input.parentId) {
    const { data: parentComment } = await db
      .from("comments")
      .select("id, story_id, episode_id, community_post_id")
      .eq("id", input.parentId)
      .eq("status", "visible")
      .maybeSingle();

    const parentMatchesStory = (() => {
      if (!isStoryComment || !parentComment) {
        return false;
      }

      return (
        parentComment.story_id === input.storyId &&
        (parentComment.episode_id ?? null) === (input.episodeId ?? null) &&
        !parentComment.community_post_id
      );
    })();

    const parentMatchesPost = (() => {
      if (!isCommunityPost || !parentComment) {
        return false;
      }

      return parentComment.community_post_id === input.communityPostId;
    })();

    if (!parentComment || (!parentMatchesStory && !parentMatchesPost)) {
      return {
        commentId: null,
        error: "Không thể trả lời bình luận này.",
        loginRequired: false,
        milestoneNotice: null
      };
    }
  }

  const rateLimit = await enforceRateLimit(input.parentId ? "reply_comment" : "comment", user.id);
  if (!rateLimit.allowed) {
    return {
      commentId: null,
      error: "Bạn đang bình luận quá nhanh. Vui lòng thử lại sau.",
      loginRequired: false,
      milestoneNotice: null
    };
  }

  const spam = detectPotentialSpamContent({
    content,
    title: null,
    userRecentCount: null,
    recentSameContentCount: null
  });

  const { data: comment, error } = await db
    .from("comments")
    .insert({
      ai_spam_suspected: spam.suspected,
      moderation_flags: spam.reasons,
      moderation_status: spam.suspected ? "flagged" : "approved",
      user_id: user.id,
      story_id: isStoryComment ? input.storyId : null,
      episode_id: isStoryComment ? (input.episodeId ?? null) : null,
      community_post_id: isCommunityPost ? input.communityPostId : null,
      parent_id: input.parentId ?? null,
      content,
      status: "visible"
    })
    .select("id")
    .single();

  if (error || !comment) {
    return {
      commentId: null,
      error: error?.message ?? "Không tạo được bình luận.",
      loginRequired: false,
      milestoneNotice: null
    };
  }

  // Persist canonical comment text to S3, NULL out inline content, keep content_preview.
  try {
    const saved = await saveCommentContentObject({
      commentId: comment.id,
      content
    });
    await db
      .from("comments")
      .update({
        content: null,
        content_blob_format: saved.blobFormat,
        content_encoding: saved.encoding,
        content_hash: saved.hash,
        content_object_key: saved.objectKey,
        content_preview: saved.contentPreview,
        content_size_bytes: saved.sizeBytes,
        content_storage_type: "s3",
        content_updated_at: new Date().toISOString()
      })
      .eq("id", comment.id);
  } catch (s3Error) {
    // Best-effort: keep the comment with inline content so it isn't lost on S3 outage.
    // A future sweep script can re-try the migration.
    console.error(
      "[comments] failed to persist S3 object, kept inline content",
      s3Error
    );
  }

  if (isStoryComment && input.storyId) {
    const syncCommon = {
      commentId: comment.id,
      storyId: input.storyId,
      episodeId: input.episodeId ?? null,
      parentCommentId: input.parentId ?? null,
      actorUserId: user.id,
      content,
      moderationStatus: spam.suspected ? "flagged" : "approved",
      spamSuspected: spam.suspected
    };

    if (input.reelsSync) {
      const { syncReelsCommentToStoryGroup } = await import(
        "@/lib/community-sync/adapters/reels-sync-adapter"
      );
      void syncReelsCommentToStoryGroup({
        ...input.reelsSync,
        ...syncCommon
      }).catch((syncError) => {
        console.error("[community-sync] reels comment sync failed", syncError);
      });
    } else {
      const { syncStoryCommentToGroup } = await import("@/lib/community-sync/comment-sync");
      const syncSurface =
        input.syncSurface ??
        (input.episodeId ? SYNC_SURFACES.chapterReader : SYNC_SURFACES.storyPage);

      void syncStoryCommentToGroup({
        ...syncCommon,
        surface: syncSurface
      }).catch((syncError) => {
        console.error("[community-sync] comment sync failed", syncError);
      });
    }
  }

  const { data: storyRow } = isStoryComment
    ? await db
        .from("stories")
        .select("creator_id, title")
        .eq("id", input.storyId as string)
        .maybeSingle()
    : { data: null };

  const { data: communityPostRow } = isCommunityPost
    ? await db
        .from("community_posts")
        .select("id, title, story_id, creator_id, user_id")
        .eq("id", input.communityPostId as string)
        .maybeSingle()
    : { data: null };

  let storyCreatorId = storyRow?.creator_id ?? null;

  if (!storyCreatorId && communityPostRow?.story_id) {
    const { data: postStoryRow } = await db
      .from("stories")
      .select("creator_id")
      .eq("id", communityPostRow.story_id)
      .maybeSingle();

    storyCreatorId = postStoryRow?.creator_id ?? null;
  }

  if (!storyCreatorId && communityPostRow?.creator_id) {
    storyCreatorId = communityPostRow.creator_id;
  }

  const { data: creatorRow } = storyCreatorId
    ? await db
        .from("creator_profiles")
        .select("user_id")
        .eq("id", storyCreatorId)
        .maybeSingle()
    : { data: null };

  await trackServerEvent({
    eventName: analyticsEvents.commentCreated,
    metadata: {
      comment_id: comment.id,
      community_post_id: input.communityPostId ?? null,
      episode_id: input.episodeId ?? null,
      parent_id: input.parentId ?? null,
      story_id: input.storyId ?? communityPostRow?.story_id ?? null,
      target_id: comment.id,
      target_type: "comment"
    },
    targetId: comment.id,
    targetType: "comment"
  });

  if (isStoryComment && input.storyId) {
    const { maybeAwardTicketsForStoryComment } = await import(
      "@/lib/recommendations/award-from-comment"
    );
    await maybeAwardTicketsForStoryComment({
      userId: user.id,
      commentId: comment.id,
      storyId: input.storyId,
      chapterId: input.episodeId ?? null,
      spamSuspected: spam.suspected
    }).catch((error) => {
      console.error("[recommendation-tickets] comment award failed", error);
    });
  }

  await safeRecordFanScoreAction({
    authorId: storyCreatorId,
    eventKey: input.parentId ? "reply_comment" : "comment",
    metadata: {
      comment_id: comment.id,
      community_post_id: input.communityPostId ?? null,
      episode_id: input.episodeId ?? null,
      parent_id: input.parentId ?? null,
      story_id: input.storyId ?? communityPostRow?.story_id ?? null
    },
    sourceId: comment.id,
    storyId: input.storyId ?? communityPostRow?.story_id ?? null,
    userId: user.id
  });

  const milestone = await awardMilestone({
    userId: user.id,
    milestoneKey: "first_comment",
    metadata: {
      comment_id: comment.id,
      community_post_id: input.communityPostId ?? null,
      episode_id: input.episodeId ?? null,
      parent_id: input.parentId ?? null,
      story_id: input.storyId ?? communityPostRow?.story_id ?? null
    }
  });

  try {
    const commentActionUrl = isCommunityPost
      ? `/community/${input.communityPostId}#comments`
      : input.episodeId
        ? `/chapter/${input.episodeId}`
        : "/notifications";

    if (input.parentId) {
      const { data: parentComment } = await db
        .from("comments")
        .select("id, user_id")
        .eq("id", input.parentId)
        .maybeSingle();

      if (parentComment?.user_id && parentComment.user_id !== user.id) {
        await createNotification(parentComment.user_id, "author_replied_to_comment", {
          actorUserId: user.id,
          actionUrl: commentActionUrl,
          body: "Bình luận của bạn vừa nhận được phản hồi mới.",
          dedupeWindowMinutes: 10,
          metadata: {
            comment_id: comment.id,
            community_post_id: input.communityPostId ?? null,
            parent_comment_id: input.parentId,
            story_id: input.storyId ?? communityPostRow?.story_id ?? null
          },
          targetId: comment.id,
          targetType: "comment",
          title: "Có phản hồi mới cho bình luận của bạn"
        });
      }
    }

    const notifyTitle = isCommunityPost
      ? (communityPostRow?.title ?? "bài cộng đồng")
      : (storyRow?.title ?? "truyện của bạn");

    if (creatorRow?.user_id && creatorRow.user_id !== user.id) {
      const aggregateSince = new Date(Date.now() - 30 * 60_000).toISOString();
      const targetType = isCommunityPost ? "community_post" : "story";
      const targetId = isCommunityPost
        ? (input.communityPostId as string)
        : (input.storyId as string);

      const { data: existingUnread } = await db
        .from("notifications")
        .select("id, metadata")
        .eq("user_id", creatorRow.user_id)
        .eq("type", "new_comment_on_story")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .is("read_at", null)
        .gte("created_at", aggregateSince)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingUnread?.id) {
        const currentCount = Number(
          ((existingUnread.metadata as Record<string, unknown> | null)?.comment_count as
            | number
            | undefined) ?? 1
        );
        const nextCount = currentCount + 1;
        await db
          .from("notifications")
          .update({
            body:
              nextCount > 1
                ? `"${notifyTitle}" có ${nextCount} bình luận mới.`
                : `"${notifyTitle}" vừa có bình luận mới.`,
            metadata: {
              comment_count: nextCount,
              community_post_id: input.communityPostId ?? null,
              last_comment_id: comment.id,
              story_id: input.storyId ?? communityPostRow?.story_id ?? null
            },
            title: nextCount > 1 ? "Bạn có nhiều bình luận mới" : "Bạn có bình luận mới"
          })
          .eq("id", existingUnread.id)
          .eq("user_id", creatorRow.user_id);
      } else {
        await createNotification(creatorRow.user_id, "new_comment_on_story", {
          actorUserId: user.id,
          actionUrl: commentActionUrl,
          body: `"${notifyTitle}" vừa có bình luận mới.`,
          dedupeWindowMinutes: 2,
          metadata: {
            comment_count: 1,
            comment_id: comment.id,
            community_post_id: input.communityPostId ?? null,
            episode_id: input.episodeId ?? null,
            story_id: input.storyId ?? communityPostRow?.story_id ?? null
          },
          targetId,
          targetType,
          title: "Bạn có bình luận mới"
        });
      }
    }
  } catch (error) {
    console.warn(
      "[notifications] comment trigger failed",
      error instanceof Error ? error.message : "Unknown notification error"
    );
  }

  if (milestone.awarded && milestone.milestone) {
    return {
      commentId: comment.id,
      error: null,
      loginRequired: false,
      milestoneNotice: buildMilestoneToastNotice({
        description: milestone.milestone.description,
        href: "/me#milestones",
        title: milestone.milestone.title
      })
    };
  }

  return {
    commentId: comment.id,
    error: null,
    loginRequired: false,
    milestoneNotice: null
  };
}

export async function createCommentAction(
  _previousState: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const storyId = String(formData.get("storyId") ?? "");
  const episodeIdValue = String(formData.get("episodeId") ?? "");
  const parentIdValue = String(formData.get("parentId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/");
  const content = String(formData.get("content") ?? "");

  const result = await createCommentRecord({
    content,
    episodeId: episodeIdValue || null,
    parentId: parentIdValue || null,
    storyId
  });

  if (result.loginRequired) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(returnTo);

  if (result.milestoneNotice) {
    const url = new URL(returnTo, getSiteOrigin());
    url.searchParams.set("milestone", "1");
    url.searchParams.set("milestoneTitle", result.milestoneNotice.title);
    url.searchParams.set("milestoneDescription", result.milestoneNotice.description);
    url.searchParams.set("milestoneHref", result.milestoneNotice.href);
    redirect(`${url.pathname}${url.search}${url.hash}`);
  }

  return { error: null };
}
