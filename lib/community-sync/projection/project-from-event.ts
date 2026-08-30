import { incrementStoryGroupActivityCount, projectEventToGroupFeedItem } from "@/lib/community-sync/interaction-events";import {
  buildAggregationBucket,
  countEventsInAggregationBucket,
  shouldUseAggregation
} from "@/lib/community-sync/projection/aggregation-bucket";
import {
  buildIndividualExcerpt,
  upsertAggregatedActivityFromBucket
} from "@/lib/community-sync/projection/aggregate-feed-item";
import type { GroupFeedItemType } from "@/lib/community-sync/constants";
import type {
  ProjectCommentFeedInput,
  ProjectCommentFeedResult
} from "@/lib/community-sync/projection/types";

/**
 * Project a comment interaction event into the story group feed.
 * Applies rate limiting + aggregation without blocking the comment request path.
 */
export async function projectCommentToGroupFeed(
  input: ProjectCommentFeedInput
): Promise<ProjectCommentFeedResult> {
  if (!input.eventId) {
    return { feedItemId: null, aggregated: false, individual: false, skipped: true, skipReason: "no_event" };
  }

  if (input.visibility === "hidden" || input.visibility === "deleted") {
    const hidden = await projectEventToGroupFeedItem({
      groupId: input.groupId,
      storyId: input.storyId,
      itemType: input.itemType,
      sourceEventId: input.eventId,
      sourceCommentId: input.commentId,
      excerpt: buildIndividualExcerpt(input.content, input.excerptMax),
      targetUrl: input.targetUrl,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      score: input.score,
      visibility: input.visibility,
      moderationStatus: input.moderationStatus,
      spoilerLevel: input.spoilerLevel,
      sourceChapterOrder: input.sourceChapterOrder
    });

    if (input.eventCreated || hidden.created) {
      await incrementStoryGroupActivityCount(input.groupId);
    }

    return {
      feedItemId: hidden.feedItemId,
      aggregated: false,
      individual: true,
      skipped: false
    };
  }

  const bucket = buildAggregationBucket({
    storyId: input.storyId,
    groupId: input.groupId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    eventType: input.eventType
  });

  const eventCount = await countEventsInAggregationBucket(
    bucket,
    input.collapseWindowMinutes
  );

  const useAggregation = shouldUseAggregation({
    eventCountInWindow: eventCount,
    maxIndividualItemsPerWindow: input.maxIndividualItemsPerWindow,
    isAuthorReply: input.isAuthorReply,
    syncAuthorReplies: input.syncAuthorReplies
  });

  if (useAggregation) {
    const aggregate = await upsertAggregatedActivityFromBucket({
      bucket,
      storyId: input.storyId,
      groupId: input.groupId,
      windowMinutes: input.collapseWindowMinutes,
      eventCount,
      targetUrl: input.targetUrl,
      sourceChapterOrder: input.sourceChapterOrder,
      sourceEventId: input.eventId,
      visibility: input.moderationStatus === "pending" ? "moderated" : input.visibility,
      moderationStatus: input.moderationStatus
    });

    if (input.eventCreated) {
      await incrementStoryGroupActivityCount(input.groupId);
    }

    return {
      feedItemId: aggregate.feedItemId,
      aggregated: true,
      individual: false,
      skipped: false
    };
  }

  const feed = await projectEventToGroupFeedItem({
    groupId: input.groupId,
    storyId: input.storyId,
    itemType: input.itemType,
    sourceEventId: input.eventId,
    sourceCommentId: input.commentId,
    excerpt: buildIndividualExcerpt(input.content, input.excerptMax),
    targetUrl: input.targetUrl,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    score: input.isAuthorReply ? Math.max(input.score, 40) : input.score,
    visibility: input.moderationStatus === "pending" ? "moderated" : input.visibility,
    moderationStatus: input.moderationStatus,
    spoilerLevel: input.spoilerLevel,
    sourceChapterOrder: input.sourceChapterOrder
  });

  if (input.eventCreated || feed.created) {
    await incrementStoryGroupActivityCount(input.groupId);
  }

  return {
    feedItemId: feed.feedItemId,
    aggregated: false,
    individual: true,
    skipped: false
  };
}
