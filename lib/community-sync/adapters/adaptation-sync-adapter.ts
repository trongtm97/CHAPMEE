import { SOURCE_ENTITY_TYPES, SYNC_SURFACES } from "@/lib/community-sync/constants";
import {
  resolveSpoilerLevelForLinkedChapter,
  resolveSyncTargetUrl
} from "@/lib/community-sync/adapters/resolve-sync-target-url";
import type {
  AdaptationCommentSyncContext,
  CommunitySyncAdapterPayload
} from "@/lib/community-sync/adapters/types";
import { resolveEpisodeChapterOrder } from "@/lib/community-sync/comment-context";
import { syncStoryCommentToGroup } from "@/lib/community-sync/comment-sync";

/**
 * Film/adaptation comment sync adapter.
 * Wire from film comment module when available.
 */
export async function buildAdaptationCommentSyncPayload(
  input: AdaptationCommentSyncContext
): Promise<CommunitySyncAdapterPayload | null> {
  if (!input.storyId?.trim() || !input.filmAdaptationId?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[community-sync/adaptation] skip: missing ids", input);
    }
    return null;
  }

  const surface =
    input.relationType === "trailer" ? SYNC_SURFACES.trailer : SYNC_SURFACES.adaptation;
  const sourceEntityType =
    input.relationType === "trailer"
      ? SOURCE_ENTITY_TYPES.trailer
      : SOURCE_ENTITY_TYPES.adaptationEpisode;

  const chapterId = input.chapterId ?? null;
  const [targetUrl, sourceChapterOrder, spoilerLevel] = await Promise.all([
    resolveSyncTargetUrl({
      surface,
      storyId: input.storyId,
      filmAdaptationId: input.filmAdaptationId,
      chapterId
    }),
    resolveEpisodeChapterOrder(chapterId),
    resolveSpoilerLevelForLinkedChapter(chapterId)
  ]);

  return {
    storyId: input.storyId,
    commentId: input.commentId,
    actorUserId: input.actorUserId,
    content: input.content,
    surface,
    sourceEntityType,
    sourceEntityId: input.filmAdaptationId,
    targetUrl,
    episodeId: chapterId,
    sourceChapterOrder,
    spoilerLevel,
    parentCommentId: input.parentCommentId ?? null,
    moderationStatus: input.moderationStatus,
    spamSuspected: input.spamSuspected,
    metadataJson: {
      surface,
      filmAdaptationId: input.filmAdaptationId,
      relationType: input.relationType ?? "adaptation",
      chapterId
    }
  };
}

export async function syncAdaptationCommentToStoryGroup(input: AdaptationCommentSyncContext) {
  const payload = await buildAdaptationCommentSyncPayload(input);
  if (!payload) {
    return { synced: false, skippedReason: "invalid_adaptation_context" as const };
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
