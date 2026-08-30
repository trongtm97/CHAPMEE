import { SOURCE_ENTITY_TYPES, SYNC_SURFACES } from "@/lib/community-sync/constants";
import {
  resolveSpoilerLevelForLinkedChapter,
  resolveSyncTargetUrl
} from "@/lib/community-sync/adapters/resolve-sync-target-url";
import type {
  CommunitySyncAdapterPayload,
  ReelsCommentSyncContext
} from "@/lib/community-sync/adapters/types";
import { resolveEpisodeChapterOrder } from "@/lib/community-sync/comment-context";
import { syncStoryCommentToGroup } from "@/lib/community-sync/comment-sync";

function logSkip(reason: string, context: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[community-sync/reels]", reason, context);
  }
}

export async function buildReelsCommentSyncPayload(
  input: ReelsCommentSyncContext & {
    commentId: string;
    actorUserId: string;
    content: string;
    parentCommentId?: string | null;
    moderationStatus?: string | null;
    spamSuspected?: boolean;
  }
): Promise<CommunitySyncAdapterPayload | null> {
  if (!input.storyId?.trim()) {
    logSkip("missing_story_id", { commentId: input.commentId });
    return null;
  }

  if (!input.reelItemId?.trim()) {
    logSkip("missing_reel_item_id", { storyId: input.storyId, commentId: input.commentId });
    return null;
  }

  const [targetUrl, sourceChapterOrder, spoilerLevel] = await Promise.all([
    resolveSyncTargetUrl({
      surface: SYNC_SURFACES.reels,
      storyId: input.storyId,
      chapterId: input.chapterId,
      reelSlug: input.reelSlug,
      reelPublicCode: input.reelPublicCode,
      reelHref: input.reelHref
    }),
    resolveEpisodeChapterOrder(input.chapterId),
    resolveSpoilerLevelForLinkedChapter(input.chapterId)
  ]);

  return {
    storyId: input.storyId,
    commentId: input.commentId,
    actorUserId: input.actorUserId,
    content: input.content,
    surface: SYNC_SURFACES.reels,
    sourceEntityType: SOURCE_ENTITY_TYPES.reel,
    sourceEntityId: input.reelItemId,
    targetUrl,
    episodeId: input.chapterId ?? null,
    sourceChapterOrder,
    spoilerLevel,
    parentCommentId: input.parentCommentId ?? null,
    moderationStatus: input.moderationStatus,
    spamSuspected: input.spamSuspected,
    metadataJson: {
      surface: SYNC_SURFACES.reels,
      reelItemId: input.reelItemId,
      chapterId: input.chapterId ?? null,
      contentSource: input.contentSource ?? null,
      reelHref: input.reelHref ?? null
    }
  };
}

export async function syncReelsCommentToStoryGroup(
  input: ReelsCommentSyncContext & {
    commentId: string;
    actorUserId: string;
    content: string;
    parentCommentId?: string | null;
    moderationStatus?: string | null;
    spamSuspected?: boolean;
  }
) {
  const payload = await buildReelsCommentSyncPayload(input);
  if (!payload) {
    return { synced: false, skippedReason: "invalid_reels_context" as const };
  }

  return syncStoryCommentToGroup({
    commentId: payload.commentId,
    storyId: payload.storyId,
    episodeId: payload.episodeId,
    parentCommentId: payload.parentCommentId,
    actorUserId: payload.actorUserId,
    content: payload.content,
    surface: payload.surface,
    moderationStatus: payload.moderationStatus,
    spamSuspected: payload.spamSuspected,
    spoilerLevel: payload.spoilerLevel,
    sourceEntityType: payload.sourceEntityType,
    sourceEntityId: payload.sourceEntityId,
    targetUrl: payload.targetUrl,
    sourceChapterOrder: payload.sourceChapterOrder ?? null,
    syncMetadata: payload.metadataJson
  });
}
