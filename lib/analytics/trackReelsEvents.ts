"use client";

import { trackEvent } from "@/lib/analytics/trackEvent";
import { analyticsEvents } from "@/lib/analytics/events";
import { resolveReelsTrackingContext } from "@/lib/tracking/resolve-reels-context";
import {
  trackReelImpression,
  trackReelReadMoreClick,
  trackUserAction
} from "@/lib/tracking/track-client";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import type { CandidatePoolId } from "@/types/feed-mixer";

export type ReelsAnalyticsContext = {
  item: ReelsItem;
  itemIndex: number;
};

const quickSkipThresholdMs = 2000;
const maxDwellTimeMs = 10 * 60 * 1000;

function reelsMetadata(
  { item, itemIndex }: ReelsAnalyticsContext,
  extra: Record<string, string | number | boolean | null> = {}
) {
  return {
    candidate_pool: item.feed?.candidatePool ?? null,
    request_id: item.feed?.requestId ?? null,
    algorithm_version: item.feed?.algorithmVersion ?? null,
    rank_position: item.feed?.rankPosition ?? itemIndex,
    creator_id: item.creatorId,
    dwell_time_ms: null,
    episode_id: item.id,
    episode_number: item.episodeNumber,
    item_index: itemIndex,
    story_id: item.storyId,
    ...extra
  };
}

function trackingPosition(context: ReelsAnalyticsContext) {
  return context.item.feed?.rankPosition ?? context.itemIndex;
}

function feedAlgorithmMeta(context: ReelsAnalyticsContext) {
  return {
    algorithmVersion: context.item.feed?.algorithmVersion ?? null,
    requestId: context.item.feed?.requestId ?? null,
    candidatePool: (context.item.feed?.candidatePool ?? null) as CandidatePoolId | null,
    position: trackingPosition(context)
  };
}

export function trackFeedImpression(context: ReelsAnalyticsContext) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackReelImpression(context.item.id, undefined, {
    itemType: tracking.itemType === "reel" ? "reel" : "chapter",
    storyId: context.item.storyId,
    authorUserId: context.item.creatorUserId,
    position: meta.position,
    slug: context.item.storySlug,
    candidatePool: meta.candidatePool,
    algorithmVersion: meta.algorithmVersion,
    requestId: meta.requestId
  });

  void trackEvent({
    eventName: analyticsEvents.feedImpression,
    metadata: reelsMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}

export function trackFeedDwellTime(
  context: ReelsAnalyticsContext,
  dwellTimeMs: number
) {
  const roundedDwellTime = Math.min(
    maxDwellTimeMs,
    Math.max(0, Math.round(dwellTimeMs))
  );
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackEvent({
    eventName: analyticsEvents.feedDwellTime,
    metadata: reelsMetadata(context, { dwell_time_ms: roundedDwellTime }),
    targetId: context.item.id,
    targetType: "episode"
  });

  if (roundedDwellTime < quickSkipThresholdMs) {
    void trackUserAction({
      surface: "reels",
      actionType: "scroll_pass",
      itemType: tracking.itemType,
      itemId: tracking.itemId,
      storyId: tracking.storyId,
      chapterId: tracking.chapterId,
      reelId: tracking.reelId,
      authorUserId: tracking.authorUserId,
      valueNumeric: roundedDwellTime,
      algorithmVersion: meta.algorithmVersion ?? undefined,
      metadata: {
        request_id: meta.requestId,
        candidate_pool: meta.candidatePool,
        position: meta.position
      }
    });
    void trackEvent({
      eventName: analyticsEvents.feedSkip,
      metadata: reelsMetadata(context, { dwell_time_ms: roundedDwellTime }),
      targetId: context.item.id,
      targetType: "episode"
    });
  } else {
    void trackUserAction({
      surface: "reels",
      actionType: "dwell",
      itemType: tracking.itemType,
      itemId: tracking.itemId,
      storyId: tracking.storyId,
      chapterId: tracking.chapterId,
      reelId: tracking.reelId,
      authorUserId: tracking.authorUserId,
      valueNumeric: roundedDwellTime,
      algorithmVersion: meta.algorithmVersion ?? undefined,
      metadata: {
        request_id: meta.requestId,
        candidate_pool: meta.candidatePool,
        position: meta.position
      }
    });
  }
}

export function trackFeedReadMore(context: ReelsAnalyticsContext) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackReelReadMoreClick(context.item.id, undefined, {
    itemType: tracking.itemType === "reel" ? "reel" : "chapter",
    storyId: context.item.storyId,
    authorUserId: context.item.creatorUserId,
    slug: context.item.storySlug
  });

  void trackUserAction({
    surface: "reels",
    actionType: "click",
    itemType: tracking.itemType,
    itemId: tracking.itemId,
    storyId: tracking.storyId,
    chapterId: tracking.chapterId,
    reelId: tracking.reelId,
    authorUserId: tracking.authorUserId,
    valueText: "read_more",
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      position: meta.position
    }
  });

  void trackUserAction({
    surface: "reels",
    actionType: "open_story",
    itemType: "story",
    itemId: context.item.storyId,
    storyId: context.item.storyId,
    authorUserId: context.item.creatorUserId,
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      slug: context.item.storySlug
    }
  });

  void trackEvent({
    eventName: analyticsEvents.feedReadMore,
    metadata: reelsMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}

export function trackFeedLike(context: ReelsAnalyticsContext, liked: boolean) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackUserAction({
    surface: "reels",
    actionType: liked ? "like" : "unlike",
    itemType: tracking.itemType,
    itemId: tracking.itemId,
    storyId: tracking.storyId,
    chapterId: tracking.chapterId,
    reelId: tracking.reelId,
    authorUserId: tracking.authorUserId,
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      position: meta.position
    }
  });
}

export function trackFeedSave(context: ReelsAnalyticsContext, saved = true) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackUserAction({
    surface: "reels",
    actionType: saved ? "save" : "unsave",
    itemType: "story",
    itemId: context.item.storyId,
    storyId: context.item.storyId,
    authorUserId: context.item.creatorUserId,
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      position: meta.position
    }
  });

  void trackEvent({
    eventName: analyticsEvents.feedSave,
    metadata: reelsMetadata(context),
    targetId: context.item.storyId,
    targetType: "story"
  });
}

export function trackFeedFollow(context: ReelsAnalyticsContext, following = true) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackUserAction({
    surface: "reels",
    actionType: following ? "follow_author" : "unfollow_author",
    itemType: "author_profile",
    itemId: context.item.creatorUserId ?? context.item.creatorId ?? context.item.id,
    storyId: context.item.storyId,
    authorUserId: context.item.creatorUserId,
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      position: meta.position
    }
  });

  void trackEvent({
    eventName: analyticsEvents.feedFollow,
    metadata: reelsMetadata(context),
    targetId: context.item.creatorId,
    targetType: "creator"
  });
}

export function trackFeedComment(context: ReelsAnalyticsContext) {
  const tracking = resolveReelsTrackingContext(context.item);
  const meta = feedAlgorithmMeta(context);

  void trackUserAction({
    surface: "reels",
    actionType: "comment",
    itemType: tracking.itemType,
    itemId: tracking.itemId,
    storyId: tracking.storyId,
    chapterId: tracking.chapterId,
    reelId: tracking.reelId,
    authorUserId: tracking.authorUserId,
    algorithmVersion: meta.algorithmVersion ?? undefined,
    metadata: {
      request_id: meta.requestId,
      candidate_pool: meta.candidatePool,
      position: meta.position
    }
  });

  void trackEvent({
    eventName: analyticsEvents.feedComment,
    metadata: reelsMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}
