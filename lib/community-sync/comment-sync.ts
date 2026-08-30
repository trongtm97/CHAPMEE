import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { groupFeedItems } from "@/lib/db/schema/story-community-sync";
import {
  buildCommentIdempotencyKey,
  countVisibleThreadReplies,
  isAuthorUser,
  isSurfaceSyncEnabled,
  mapCommentToFeedVisibility,
  mapCommentToModerationStatus,
  resolveCommentTargetUrl,
  resolveEpisodeChapterOrder,
  resolveRootCommentId,
  resolveSourceEntity,
  truncateExcerpt
} from "@/lib/community-sync/comment-context";
import {
  GROUP_FEED_ITEM_TYPES,
  INTERACTION_EVENT_TYPES,
  SOURCE_ENTITY_TYPES,
  SYNC_SURFACES,
  type SourceEntityType,
  type SyncSurface
} from "@/lib/community-sync/constants";
import { createInteractionEvent } from "@/lib/community-sync/interaction-events";
import { projectCommentToGroupFeed } from "@/lib/community-sync/projection/project-from-event";
import { getCommunitySyncSettings } from "@/lib/community-sync/sync-settings";
import { getOrCreateStoryGroup } from "@/lib/community-sync/story-groups";
import type { SpoilerLevel } from "@/types/story-community-sync";

const HOT_THREAD_REPLY_THRESHOLD = 3;

export type StoryCommentSyncInput = {
  commentId: string;
  storyId: string;
  episodeId?: string | null;
  parentCommentId?: string | null;
  actorUserId: string;
  content: string;
  surface?: SyncSurface;
  moderationStatus?: string | null;
  spamSuspected?: boolean;
  spoilerLevel?: SpoilerLevel;
  /** Adapter override — when set, skips resolveSourceEntity(). */
  sourceEntityType?: SourceEntityType;
  sourceEntityId?: string;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  syncMetadata?: Record<string, unknown>;
};

export type CommentSyncResult = {
  synced: boolean;
  skippedReason?: string;
  eventId?: string | null;
  feedItemId?: string | null;
  aggregated?: boolean;
};

async function isNewAccountUser(userId: string) {
  const { rows } = await db.execute(sql`
    select created_at
    from public.profiles
    where id = ${userId}::uuid
    limit 1
  `);
  const createdAt = (rows[0] as { created_at?: string } | undefined)?.created_at;
  if (!createdAt) {
    return false;
  }
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs < 3 * 24 * 60 * 60 * 1000;
}

async function isPaidEpisode(episodeId?: string | null) {
  if (!episodeId) {
    return false;
  }

  const { rows } = await db.execute(sql`
    select is_paid
    from public.episodes
    where id = ${episodeId}::uuid
    limit 1
  `);

  return Boolean((rows[0] as { is_paid?: boolean } | undefined)?.is_paid);
}

async function resolveCommentFeedState(input: {
  storyId: string;
  actorUserId: string;
  spamSuspected?: boolean;
  moderationStatus?: string | null;
  hideSpamFromGroup: boolean;
  requireModerationForNewAccounts: boolean;
}) {
  let moderationStatus = mapCommentToModerationStatus(input.moderationStatus);
  let visibility = mapCommentToFeedVisibility({
    status: "visible",
    moderationStatus: input.moderationStatus
  });

  if (input.hideSpamFromGroup && (input.spamSuspected || input.moderationStatus === "flagged")) {
    moderationStatus = "flagged";
    visibility = "hidden";
  }

  if (
    input.requireModerationForNewAccounts &&
    moderationStatus !== "approved" &&
    (await isNewAccountUser(input.actorUserId))
  ) {
    moderationStatus = "pending";
    visibility = "moderated";
  }

  return { moderationStatus, visibility };
}

async function runCommentSyncPipeline(input: {
  commentId: string;
  storyId: string;
  episodeId?: string | null;
  parentCommentId?: string | null;
  actorUserId: string;
  content: string;
  surface?: SyncSurface;
  moderationStatus?: string | null;
  spamSuspected?: boolean;
  sourceEntityType?: SourceEntityType;
  sourceEntityId?: string;
  targetUrl?: string | null;
  sourceChapterOrder?: number | null;
  syncMetadata?: Record<string, unknown>;
  eventType: (typeof INTERACTION_EVENT_TYPES)[keyof typeof INTERACTION_EVENT_TYPES];
  itemType: (typeof GROUP_FEED_ITEM_TYPES)[keyof typeof GROUP_FEED_ITEM_TYPES];
  idempotencyEventType: string;
  score: number;
  spoilerLevel?: SpoilerLevel;
  projectFeed: boolean;
}): Promise<CommentSyncResult> {
  const settings = await getCommunitySyncSettings();
  const isAuthor = await isAuthorUser(input.storyId, input.actorUserId);
  const isAuthorReply =
    input.eventType === INTERACTION_EVENT_TYPES.authorReply ||
    (isAuthor && input.eventType === INTERACTION_EVENT_TYPES.commentReply);

  if (!isSurfaceSyncEnabled(input.surface, settings)) {
    return { synced: false, skippedReason: "surface_sync_disabled" };
  }

  if (
    !isAuthor &&
    !isAuthorReply &&
    input.content.trim().length < settings.minCommentLengthToSurface
  ) {
    return { synced: false, skippedReason: "too_short" };
  }

  const { moderationStatus, visibility } = await resolveCommentFeedState({
    storyId: input.storyId,
    actorUserId: input.actorUserId,
    spamSuspected: input.spamSuspected,
    moderationStatus: input.moderationStatus,
    hideSpamFromGroup: settings.hideSpamFromGroup,
    requireModerationForNewAccounts: settings.requireModerationForNewAccounts
  });

  const groupResult = await getOrCreateStoryGroup(input.storyId);
  if (!groupResult.group) {
    return { synced: false, skippedReason: groupResult.error ?? "no_group" };
  }

  const group = groupResult.group;
  const { sourceEntityType, sourceEntityId } =
    input.sourceEntityType && input.sourceEntityId
      ? { sourceEntityType: input.sourceEntityType, sourceEntityId: input.sourceEntityId }
      : resolveSourceEntity({
          storyId: input.storyId,
          episodeId: input.episodeId,
          surface: input.surface
        });

  const [targetUrl, resolvedChapterOrder] = await Promise.all([
    input.targetUrl !== undefined
      ? Promise.resolve(input.targetUrl)
      : resolveCommentTargetUrl({ storyId: input.storyId, episodeId: input.episodeId }),
    input.sourceChapterOrder !== undefined
      ? Promise.resolve(input.sourceChapterOrder)
      : resolveEpisodeChapterOrder(input.episodeId)
  ]);

  const sourceChapterOrder = resolvedChapterOrder;
  const spoilerLevel: SpoilerLevel =
    input.spoilerLevel ??
    (input.episodeId ? ((await isPaidEpisode(input.episodeId)) ? "mild" : "none") : "none");

  const paidEpisode = spoilerLevel === "mild";
  const excerptMax = paidEpisode ? settings.paidChapterCommentPreview : 200;

  const event = await createInteractionEvent({
    actorUserId: input.actorUserId,
    storyId: input.storyId,
    groupId: group.id,
    eventType: input.eventType,
    sourceEntityType,
    sourceEntityId,
    idempotencyKey: buildCommentIdempotencyKey(input.idempotencyEventType, input.commentId),
    targetUrl,
    sourceCommentId: input.commentId,
    parentCommentId: input.parentCommentId ?? null,
    moderationStatus,
    spoilerLevel,
    sourceChapterOrder,
    metadataJson: {
      surface: input.surface ?? SYNC_SURFACES.chapterReader,
      excerpt: truncateExcerpt(input.content, excerptMax),
      ...input.syncMetadata
    }
  });

  if (!input.projectFeed) {
    return { synced: true, eventId: event.eventId, feedItemId: null };
  }

  const projection = await projectCommentToGroupFeed({
    eventId: event.eventId,
    eventCreated: event.created,
    groupId: group.id,
    storyId: input.storyId,
    commentId: input.commentId,
    actorUserId: input.actorUserId,
    content: input.content,
    eventType: input.eventType,
    itemType: input.itemType,
    sourceEntityType,
    sourceEntityId,
    targetUrl,
    sourceChapterOrder,
    spoilerLevel,
    moderationStatus,
    visibility,
    score: input.score,
    isAuthorReply,
    excerptMax,
    collapseWindowMinutes: settings.collapseWindowMinutes,
    maxIndividualItemsPerWindow: settings.maxActivityItemsPerSourcePerHour,
    syncAuthorReplies: settings.syncAuthorReplies
  });

  return {
    synced: true,
    eventId: event.eventId,
    feedItemId: projection.feedItemId,
    aggregated: projection.aggregated
  };
}

export async function syncCommentToStoryGroup(
  input: StoryCommentSyncInput
): Promise<CommentSyncResult> {
  return runCommentSyncPipeline({
    ...input,
    parentCommentId: null,
    eventType: INTERACTION_EVENT_TYPES.commentCreated,
    itemType: GROUP_FEED_ITEM_TYPES.comment,
    idempotencyEventType: INTERACTION_EVENT_TYPES.commentCreated,
    score: 10,
    projectFeed: true
  });
}

export async function syncAuthorReplyToStoryGroup(
  input: StoryCommentSyncInput
): Promise<CommentSyncResult> {
  const settings = await getCommunitySyncSettings();
  if (!settings.syncAuthorReplies) {
    return { synced: false, skippedReason: "author_reply_sync_disabled" };
  }

  return runCommentSyncPipeline({
    ...input,
    eventType: INTERACTION_EVENT_TYPES.authorReply,
    itemType: GROUP_FEED_ITEM_TYPES.authorReply,
    idempotencyEventType: INTERACTION_EVENT_TYPES.authorReply,
    score: 40,
    projectFeed: true
  });
}

export async function syncReplyToStoryGroup(
  input: StoryCommentSyncInput
): Promise<CommentSyncResult> {
  if (!input.parentCommentId) {
    return { synced: false, skippedReason: "missing_parent" };
  }

  const settings = await getCommunitySyncSettings();
  const isAuthor = await isAuthorUser(input.storyId, input.actorUserId);

  if (isAuthor && settings.syncAuthorReplies) {
    return syncAuthorReplyToStoryGroup(input);
  }

  const rootCommentId = await resolveRootCommentId(input.parentCommentId);
  const replyCount = await countVisibleThreadReplies(rootCommentId);
  const isHot = replyCount >= HOT_THREAD_REPLY_THRESHOLD;

  if (!isHot) {
    const groupResult = await getOrCreateStoryGroup(input.storyId);
    if (groupResult.group) {
      const { sourceEntityType, sourceEntityId } = resolveSourceEntity({
        storyId: input.storyId,
        episodeId: input.episodeId,
        surface: input.surface
      });

      await createInteractionEvent({
        actorUserId: input.actorUserId,
        storyId: input.storyId,
        groupId: groupResult.group.id,
        eventType: INTERACTION_EVENT_TYPES.commentReply,
        sourceEntityType,
        sourceEntityId,
        idempotencyKey: buildCommentIdempotencyKey(
          INTERACTION_EVENT_TYPES.commentReply,
          input.commentId
        ),
        sourceCommentId: input.commentId,
        parentCommentId: input.parentCommentId,
        metadataJson: { surface: input.surface ?? null, surfaced_to_feed: false }
      });
    }

    return { synced: false, skippedReason: "reply_not_surfaced" };
  }

  return runCommentSyncPipeline({
    ...input,
    eventType: INTERACTION_EVENT_TYPES.commentReply,
    itemType: GROUP_FEED_ITEM_TYPES.comment,
    idempotencyEventType: INTERACTION_EVENT_TYPES.commentReply,
    score: 18,
    projectFeed: true
  });
}

export async function syncStoryCommentToGroup(
  input: StoryCommentSyncInput
): Promise<CommentSyncResult> {
  if (input.parentCommentId) {
    return syncReplyToStoryGroup(input);
  }

  return syncCommentToStoryGroup(input);
}

/** Adapter entry for audio/adaptation comment modules. */
export async function syncExternalCommentToStoryGroup(
  payload: import("@/lib/community-sync/constants").ExternalCommentSyncPayload
): Promise<CommentSyncResult> {
  if (payload.sourceEntityType === SOURCE_ENTITY_TYPES.audioEpisode) {
    const { syncAudioCommentToStoryGroup } = await import(
      "@/lib/community-sync/adapters/audio-sync-adapter"
    );
    return syncAudioCommentToStoryGroup({
      storyId: payload.storyId,
      audioItemId: payload.sourceEntityId,
      commentId: payload.commentId,
      actorUserId: payload.actorUserId,
      content: payload.content,
      timestampSeconds:
        typeof payload.metadata?.timestampSeconds === "number"
          ? payload.metadata.timestampSeconds
          : null,
      chapterId:
        typeof payload.metadata?.chapterId === "string" ? payload.metadata.chapterId : null
    });
  }

  if (
    payload.sourceEntityType === SOURCE_ENTITY_TYPES.adaptationEpisode ||
    payload.sourceEntityType === SOURCE_ENTITY_TYPES.trailer
  ) {
    const { syncAdaptationCommentToStoryGroup } = await import(
      "@/lib/community-sync/adapters/adaptation-sync-adapter"
    );
    return syncAdaptationCommentToStoryGroup({
      storyId: payload.storyId,
      filmAdaptationId: payload.sourceEntityId,
      commentId: payload.commentId,
      actorUserId: payload.actorUserId,
      content: payload.content,
      relationType:
        payload.sourceEntityType === SOURCE_ENTITY_TYPES.trailer ? "trailer" : "adaptation",
      chapterId:
        typeof payload.metadata?.chapterId === "string" ? payload.metadata.chapterId : null
    });
  }

  return syncCommentToStoryGroup({
    commentId: payload.commentId,
    storyId: payload.storyId,
    episodeId: null,
    actorUserId: payload.actorUserId,
    content: payload.content,
    surface: SYNC_SURFACES.chapterReader,
    spoilerLevel: payload.spoilerLevel,
    targetUrl: payload.targetUrl,
    sourceChapterOrder: payload.sourceChapterOrder ?? null
  });
}

export async function updateGroupFeedItemVisibilityFromCommentStatus(input: {
  commentId: string;
  status: string;
  moderationStatus?: string | null;
}) {
  const visibility = mapCommentToFeedVisibility({
    status: input.status,
    moderationStatus: input.moderationStatus
  });
  const moderationStatus = mapCommentToModerationStatus(input.moderationStatus);

  await db
    .update(groupFeedItems)
    .set({
      visibility,
      moderationStatus,
      updatedAt: new Date()
    })
    .where(eq(groupFeedItems.sourceCommentId, input.commentId));

  return { visibility, moderationStatus };
}

export async function refreshGroupFeedVisibilityForComment(commentId: string) {
  const { rows } = await db.execute(sql`
    select status, moderation_status
    from public.comments
    where id = ${commentId}::uuid
    limit 1
  `);

  const comment = rows[0] as
    | { status: string; moderation_status: string | null }
    | undefined;

  if (!comment) {
    return { ok: false, error: "comment_not_found" };
  }

  return {
    ok: true,
    ...(await updateGroupFeedItemVisibilityFromCommentStatus({
      commentId,
      status: comment.status,
      moderationStatus: comment.moderation_status
    }))
  };
}
