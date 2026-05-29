"use client";

import { trackEvent } from "@/lib/analytics/trackEvent";
import { analyticsEvents } from "@/lib/analytics/events";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

export type SwipeAnalyticsContext = {
  item: SwipeItem;
  itemIndex: number;
};

const quickSkipThresholdMs = 2000;
const maxDwellTimeMs = 10 * 60 * 1000;

// TODO: Batch high-volume Swipe events if feed traffic grows. For MVP we track
// one impression per rendered item view and one dwell event when leaving it.

function swipeMetadata(
  { item, itemIndex }: SwipeAnalyticsContext,
  extra: Record<string, string | number | boolean | null> = {}
) {
  return {
    creator_id: item.creatorId,
    dwell_time_ms: null,
    episode_id: item.id,
    episode_number: item.episodeNumber,
    item_index: itemIndex,
    story_id: item.storyId,
    ...extra
  };
}

export function trackFeedImpression(context: SwipeAnalyticsContext) {
  void trackEvent({
    eventName: analyticsEvents.feedImpression,
    metadata: swipeMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}

export function trackFeedDwellTime(
  context: SwipeAnalyticsContext,
  dwellTimeMs: number
) {
  const roundedDwellTime = Math.min(
    maxDwellTimeMs,
    Math.max(0, Math.round(dwellTimeMs))
  );

  void trackEvent({
    eventName: analyticsEvents.feedDwellTime,
    metadata: swipeMetadata(context, { dwell_time_ms: roundedDwellTime }),
    targetId: context.item.id,
    targetType: "episode"
  });

  if (roundedDwellTime < quickSkipThresholdMs) {
    void trackEvent({
      eventName: analyticsEvents.feedSkip,
      metadata: swipeMetadata(context, { dwell_time_ms: roundedDwellTime }),
      targetId: context.item.id,
      targetType: "episode"
    });
  }
}

export function trackFeedReadMore(context: SwipeAnalyticsContext) {
  void trackEvent({
    eventName: analyticsEvents.feedReadMore,
    metadata: swipeMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}

export function trackFeedSave(context: SwipeAnalyticsContext) {
  void trackEvent({
    eventName: analyticsEvents.feedSave,
    metadata: swipeMetadata(context),
    targetId: context.item.storyId,
    targetType: "story"
  });
}

export function trackFeedFollow(context: SwipeAnalyticsContext) {
  void trackEvent({
    eventName: analyticsEvents.feedFollow,
    metadata: swipeMetadata(context),
    targetId: context.item.creatorId,
    targetType: "creator"
  });
}

export function trackFeedComment(context: SwipeAnalyticsContext) {
  void trackEvent({
    eventName: analyticsEvents.feedComment,
    metadata: swipeMetadata(context),
    targetId: context.item.id,
    targetType: "episode"
  });
}
