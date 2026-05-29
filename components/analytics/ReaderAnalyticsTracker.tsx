"use client";

import { useEffect, useRef } from "react";
import {
  trackCompleteChapterOnce,
  trackReaderProgress,
  trackStartReading,
  type ReaderAnalyticsContext
} from "@/lib/analytics/trackReaderEvents";

type ReaderAnalyticsTrackerProps = {
  context: ReaderAnalyticsContext;
};

const scrollMilestones = [25, 50, 75] as const;

function getScrollPercent() {
  const readerContent = document.querySelector("[data-reader-content]");

  if (readerContent) {
    const bounds = readerContent.getBoundingClientRect();
    const viewportBottom = window.innerHeight;
    const visibleProgress = viewportBottom - bounds.top;

    if (bounds.height <= 0) {
      return 100;
    }

    return Math.min(100, Math.max(0, (visibleProgress / bounds.height) * 100));
  }

  const element = document.documentElement;
  const scrollableHeight = element.scrollHeight - window.innerHeight;

  if (scrollableHeight <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100));
}

export function ReaderAnalyticsTracker({
  context
}: ReaderAnalyticsTrackerProps) {
  const firedMilestones = useRef(new Set<number>());

  useEffect(() => {
    trackStartReading(context);

    function handleScroll() {
      const percent = getScrollPercent();

      for (const milestone of scrollMilestones) {
        if (percent >= milestone && !firedMilestones.current.has(milestone)) {
          firedMilestones.current.add(milestone);
          trackReaderProgress(context, milestone);
        }
      }

      if (percent >= 95) {
        trackCompleteChapterOnce(context, "scroll_end");
      }
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [context]);

  return null;
}
