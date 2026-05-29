"use client";

import { useMemo } from "react";
import { getHighestPrioritySegment } from "@/lib/lifecycle/segments";
import type { LifecycleSegment } from "@/types/lifecycle";

export function useLifecycleSegment(segments: LifecycleSegment[]) {
  const highestPrioritySegment = useMemo(
    () => getHighestPrioritySegment(segments),
    [segments]
  );

  return {
    highestPrioritySegment,
    hasSegments: segments.length > 0
  };
}
