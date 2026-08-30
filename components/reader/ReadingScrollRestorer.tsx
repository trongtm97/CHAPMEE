"use client";

import { useEffect, useRef } from "react";
import { loadReadingScrollPosition } from "@/lib/reader/reading-scroll-position";

type ReadingScrollRestorerProps = {
  storyId: string;
  episodeId: string;
  enabled?: boolean;
};

export function ReadingScrollRestorer({
  enabled = true,
  episodeId,
  storyId
}: ReadingScrollRestorerProps) {
  const restored = useRef(false);

  useEffect(() => {
    if (!enabled || restored.current) {
      return;
    }

    const saved = loadReadingScrollPosition(storyId, episodeId);
    if (!saved || saved.scrollPercent <= 2) {
      restored.current = true;
      return;
    }

    const scrollPercent = saved.scrollPercent;

    function restore() {
      const readerContent = document.querySelector("[data-reader-content]");
      if (!readerContent) {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollable > 0) {
          window.scrollTo({
            top: (scrollPercent / 100) * scrollable,
            behavior: "auto"
          });
        }
        restored.current = true;
        return;
      }

      const rect = readerContent.getBoundingClientRect();
      const contentTop = window.scrollY + rect.top;
      const target = contentTop + (rect.height * scrollPercent) / 100 - window.innerHeight * 0.35;
      window.scrollTo({
        top: Math.max(0, target),
        behavior: "auto"
      });
      restored.current = true;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restore);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [enabled, episodeId, storyId]);

  return null;
}
