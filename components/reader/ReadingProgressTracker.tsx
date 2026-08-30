"use client";

import { useEffect, useRef } from "react";
import { saveReadingScrollPosition } from "@/lib/reader/reading-scroll-position";
import { updateReadingProgress } from "@/lib/reading/updateReadingProgress";

type ReadingProgressTrackerProps = {
  storyId: string;
  episodeId: string;
  returnTo: string;
};

function getReadableProgress() {
  const readerContent = document.querySelector("[data-reader-content]");
  if (!readerContent) {
    const element = document.documentElement;
    const scrollableHeight = element.scrollHeight - window.innerHeight;
    if (scrollableHeight <= 0) {
      return 100;
    }
    return Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100));
  }

  const rect = readerContent.getBoundingClientRect();
  const total = rect.height;
  if (total <= 0) {
    return 100;
  }

  const viewportBottom = window.scrollY + window.innerHeight;
  const contentTop = window.scrollY + rect.top;
  const read = viewportBottom - contentTop;

  return Math.min(100, Math.max(0, (read / total) * 100));
}

const LOCAL_DEBOUNCE_MS = 400;
const SERVER_DEBOUNCE_MS = 3000;

export function ReadingProgressTracker({
  episodeId,
  returnTo,
  storyId
}: ReadingProgressTrackerProps) {
  const savedMilestones = useRef(new Set<number>());
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalPercent = useRef(0);

  useEffect(() => {
    async function persistProgress(percent: number) {
      const milestone = percent >= 95 ? 100 : percent >= 85 ? 90 : percent >= 50 ? 50 : null;
      if (milestone === null || savedMilestones.current.has(milestone)) {
        return;
      }
      savedMilestones.current.add(milestone);
      await updateReadingProgress({
        episodeId,
        progressPercent: milestone,
        returnTo,
        storyId
      });
    }

    function handleScroll() {
      const percent = getReadableProgress();
      if (Math.abs(percent - lastLocalPercent.current) < 1) {
        return;
      }
      lastLocalPercent.current = percent;

      if (localTimer.current) {
        clearTimeout(localTimer.current);
      }
      localTimer.current = setTimeout(() => {
        saveReadingScrollPosition({ storyId, episodeId, scrollPercent: percent });
      }, LOCAL_DEBOUNCE_MS);

      if (serverTimer.current) {
        clearTimeout(serverTimer.current);
      }
      serverTimer.current = setTimeout(() => {
        void persistProgress(percent);
      }, SERVER_DEBOUNCE_MS);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (localTimer.current) {
        clearTimeout(localTimer.current);
      }
      if (serverTimer.current) {
        clearTimeout(serverTimer.current);
      }
    };
  }, [episodeId, returnTo, storyId]);

  return null;
}
