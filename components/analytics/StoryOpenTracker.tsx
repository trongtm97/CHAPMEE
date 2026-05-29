"use client";

import { useEffect } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";

type StoryOpenTrackerProps = {
  storyId: string;
  slug: string;
};

export function StoryOpenTracker({ slug, storyId }: StoryOpenTrackerProps) {
  useEffect(() => {
    void trackEvent({
      eventName: analyticsEvents.openStory,
      metadata: {
        slug,
        story_id: storyId
      },
      targetId: storyId,
      targetType: "story"
    });
  }, [slug, storyId]);

  return null;
}
