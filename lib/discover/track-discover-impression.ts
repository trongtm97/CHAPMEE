"use client";

import { trackExposure, trackUserAction } from "@/lib/tracking/track-client";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { TrackingSurface } from "@/types/tracking";

export function trackDiscoverImpression(
  story: DiscoverStory,
  options: {
    surface?: TrackingSurface;
    position?: number;
  } = {}
) {
  const surface = options.surface ?? "discover";
  const position = options.position ?? story.feed?.rankPosition ?? null;

  void trackExposure({
    surface,
    itemType: "story",
    itemId: story.id,
    storyId: story.id,
    authorUserId: story.creatorUserId ?? null,
    position,
    candidatePool: story.feed?.candidatePool ?? null,
    requestId: story.feed?.requestId ?? null,
    algorithmVersion: story.feed?.algorithmVersion ?? null
  });

  void trackUserAction({
    surface,
    actionType: "impression",
    itemType: "story",
    itemId: story.id,
    storyId: story.id,
    authorUserId: story.creatorUserId ?? null,
    algorithmVersion: story.feed?.algorithmVersion ?? null,
    metadata: {
      position,
      candidate_pool: story.feed?.candidatePool ?? null,
      request_id: story.feed?.requestId ?? null,
      section: story.feed?.sectionKey ?? null
    }
  });
}

export function trackDiscoverClick(
  story: DiscoverStory,
  options: {
    surface?: TrackingSurface;
    position?: number;
  } = {}
) {
  const surface = options.surface ?? "discover";

  void trackUserAction({
    surface,
    actionType: "click",
    itemType: "story",
    itemId: story.id,
    storyId: story.id,
    authorUserId: story.creatorUserId ?? null,
    algorithmVersion: story.feed?.algorithmVersion ?? null,
    metadata: {
      position: options.position ?? story.feed?.rankPosition ?? null,
      candidate_pool: story.feed?.candidatePool ?? null,
      request_id: story.feed?.requestId ?? null,
      section: story.feed?.sectionKey ?? null
    }
  });
}
