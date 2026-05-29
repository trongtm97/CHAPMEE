"use client";

import { useEffect, useRef } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import type { AnalyticsEventName } from "@/types/analytics";

type PageViewTrackerProps = {
  eventName?: AnalyticsEventName;
  targetId?: string | null;
  targetType?: "story" | "episode" | "comment" | "community_post" | "creator" | "feed" | "page";
  pageLabel?: string;
};

export function PageViewTracker({
  eventName = analyticsEvents.pageViewed,
  pageLabel,
  targetId = null,
  targetType = "page"
}: PageViewTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    void trackEvent({
      eventName,
      metadata: {
        pathname: window.location.pathname,
        page_label: pageLabel ?? null
      },
      targetId,
      targetType
    });
  }, [eventName, pageLabel, targetId, targetType]);

  return null;
}
