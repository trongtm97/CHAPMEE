"use client";

import { useEffect } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { trackStoryOpen } from "@/lib/tracking/track-client";

type StoryOpenTrackerProps = {
  storyId: string;
  slug: string;
  authorUserId?: string | null;
  isStandalone?: boolean;
};

export function StoryOpenTracker({
  authorUserId,
  isStandalone = false,
  slug,
  storyId
}: StoryOpenTrackerProps) {
  useEffect(() => {
    void trackStoryOpen(storyId, undefined, {
      slug,
      authorUserId: authorUserId ?? null,
      surface: "story_detail"
    });
    void trackEvent({
      eventName: isStandalone
        ? analyticsEvents.standaloneStoryRead
        : analyticsEvents.openStory,
      metadata: {
        slug,
        story_id: storyId,
        structure_type: isStandalone ? "standalone" : "chaptered"
      },
      targetId: storyId,
      targetType: "story"
    });
    void trackEvent({
      eventName: analyticsEvents.storyViewed,
      metadata: {
        slug,
        story_id: storyId,
        structure_type: isStandalone ? "standalone" : "chaptered"
      },
      targetId: storyId,
      targetType: "story"
    });
  }, [authorUserId, isStandalone, slug, storyId]);

  return null;
}
