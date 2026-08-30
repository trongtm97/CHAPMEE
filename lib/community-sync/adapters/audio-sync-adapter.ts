import { SOURCE_ENTITY_TYPES, SYNC_SURFACES } from "@/lib/community-sync/constants";
import {
  resolveSpoilerLevelForLinkedChapter,
  resolveSyncTargetUrl
} from "@/lib/community-sync/adapters/resolve-sync-target-url";
import type {
  AudioCommentSyncContext,
  CommunitySyncAdapterPayload
} from "@/lib/community-sync/adapters/types";
import { resolveEpisodeChapterOrder } from "@/lib/community-sync/comment-context";
import { syncStoryCommentToGroup } from "@/lib/community-sync/comment-sync";

/**
 * Audio comment sync adapter.
 * Wire this from the audio comment module when it exists — no fake UI/data.
 */
export async function buildAudioCommentSyncPayload(
  input: AudioCommentSyncContext
): Promise<CommunitySyncAdapterPayload | null> {
  if (!input.storyId?.trim() || !input.audioItemId?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[community-sync/audio] skip: missing story or audio item", input);
    }
    return null;
  }

  const chapterId = input.chapterId ?? null;
  const [targetUrl, sourceChapterOrder, spoilerLevel] = await Promise.all([
    resolveSyncTargetUrl({
      surface: SYNC_SURFACES.audio,
      storyId: input.storyId,
      audioItemId: input.audioItemId,
      timestampSeconds: input.timestampSeconds,
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
    surface: SYNC_SURFACES.audio,
    sourceEntityType: SOURCE_ENTITY_TYPES.audioEpisode,
    sourceEntityId: input.audioItemId,
    targetUrl,
    episodeId: chapterId,
    sourceChapterOrder,
    spoilerLevel,
    parentCommentId: input.parentCommentId ?? null,
    moderationStatus: input.moderationStatus,
    spamSuspected: input.spamSuspected,
    metadataJson: {
      surface: SYNC_SURFACES.audio,
      audioItemId: input.audioItemId,
      timestampSeconds: input.timestampSeconds ?? null,
      chapterId
    }
  };
}

export async function syncAudioCommentToStoryGroup(input: AudioCommentSyncContext) {
  const payload = await buildAudioCommentSyncPayload(input);
  if (!payload) {
    return { synced: false, skippedReason: "invalid_audio_context" as const };
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
