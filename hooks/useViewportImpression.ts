"use client";

import { useEffect, useRef } from "react";

type UseViewportImpressionOptions = {
  /** Unique key per surface + item; prevents duplicate impressions in one session. */
  impressionKey: string;
  onImpression: () => void;
  /** Minimum visible duration before firing (ms). */
  minVisibleMs?: number;
  /** Intersection ratio threshold. */
  threshold?: number;
  enabled?: boolean;
  root?: Element | null;
};

const seenImpressionKeys = new Set<string>();

export function useViewportImpression({
  impressionKey,
  onImpression,
  minVisibleMs = 750,
  threshold = 0.55,
  enabled = true,
  root = null
}: UseViewportImpressionOptions) {
  const elementRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onImpressionRef = useRef(onImpression);

  useEffect(() => {
    onImpressionRef.current = onImpression;
  }, [onImpression]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (seenImpressionKeys.has(impressionKey)) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (timerRef.current) {
            return;
          }
          timerRef.current = setTimeout(() => {
            if (seenImpressionKeys.has(impressionKey)) {
              return;
            }
            seenImpressionKeys.add(impressionKey);
            onImpressionRef.current();
          }, minVisibleMs);
          return;
        }

        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      },
      {
        root,
        threshold: [threshold]
      }
    );

    observer.observe(element);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      observer.disconnect();
    };
  }, [enabled, impressionKey, minVisibleMs, root, threshold]);

  return elementRef;
}
