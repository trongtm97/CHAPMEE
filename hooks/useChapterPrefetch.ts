"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ChapterPrefetchTarget, ReaderPrefetchReason } from "@/src/lib/reader/reader-prefetch";
import {
  abortChapterPrefetch,
  prefetchChapterContent,
  resetReaderPrefetchForStory,
  seedChapterPrefetchCache,
  shouldSkipReaderPrefetch
} from "@/src/lib/reader/reader-prefetch";

type UseChapterPrefetchInput = {
  storyId: string;
  current: ChapterPrefetchTarget;
  next: ChapterPrefetchTarget | null;
  previous: ChapterPrefetchTarget | null;
  currentContent?: {
    content: string;
    structuredContent: unknown | null;
    source?: string | null;
  };
};

function getReadableProgress() {
  const readerContent = document.querySelector("[data-reader-content]");
  if (!readerContent) {
    return 0;
  }

  const rect = readerContent.getBoundingClientRect();
  if (rect.height <= 0) {
    return 0;
  }

  const viewportBottom = window.scrollY + window.innerHeight;
  const contentTop = window.scrollY + rect.top;
  return Math.min(100, Math.max(0, ((viewportBottom - contentTop) / rect.height) * 100));
}

export function useChapterPrefetch({
  current,
  currentContent,
  next,
  previous,
  storyId
}: UseChapterPrefetchInput) {
  const router = useRouter();
  const scrollTriggered = useRef(false);

  const prefetchTarget = useCallback(
    (target: ChapterPrefetchTarget | null, reason: ReaderPrefetchReason) => {
      if (!target?.href) {
        return;
      }

      const skip = shouldSkipReaderPrefetch();
      if (!skip) {
        router.prefetch(target.href);
      }
      void prefetchChapterContent(target, reason);
    },
    [router]
  );

  useEffect(() => {
    resetReaderPrefetchForStory(storyId);
    scrollTriggered.current = false;
  }, [current.chapterId, storyId]);

  useEffect(() => {
    if (currentContent) {
      seedChapterPrefetchCache(current, currentContent);
    }
  }, [current, currentContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      prefetchTarget(next, "idle");
    }, 1100);

    return () => {
      window.clearTimeout(timer);
      abortChapterPrefetch(next);
    };
  }, [next, prefetchTarget]);

  useEffect(() => {
    function onScroll() {
      if (scrollTriggered.current || getReadableProgress() < 60) {
        return;
      }
      scrollTriggered.current = true;
      prefetchTarget(next, "scroll");
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [next, prefetchTarget]);

  const prefetchNext = useCallback(
    (reason: ReaderPrefetchReason = "hover") => prefetchTarget(next, reason),
    [next, prefetchTarget]
  );

  const prefetchPrevious = useCallback(
    (reason: ReaderPrefetchReason = "hover") => prefetchTarget(previous, reason),
    [prefetchTarget, previous]
  );

  return useMemo(
    () => ({
      prefetchNext,
      prefetchPrevious
    }),
    [prefetchNext, prefetchPrevious]
  );
}
