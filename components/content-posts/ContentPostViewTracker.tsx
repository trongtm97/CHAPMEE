"use client";

import { useEffect } from "react";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";

/**
 * Fire-and-forget view beacon for a content post. Counts at most once per
 * browser session per post to avoid inflating numbers on reloads/prefetch.
 */
export function ContentPostViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    if (!postId) {
      return;
    }

    const key = `cp-viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) {
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — fall through and still count the view.
    }

    void trackEvent({
      eventName: analyticsEvents.contentPostViewed,
      metadata: { post_id: postId },
      targetId: postId,
      targetType: "page"
    });

    void fetch(`/api/content-posts/${postId}/view`, {
      method: "POST",
      keepalive: true
    }).catch(() => {
      // Ignore network errors — view tracking is best-effort.
    });
  }, [postId]);

  return null;
}
