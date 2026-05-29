"use client";

import dynamic from "next/dynamic";
import { SwipePageSkeleton } from "@/components/ui/navigation-skeletons";
import type { SwipeFeedProps } from "@/components/swipe/SwipeFeed";

const SwipeFeed = dynamic(
  () => import("@/components/swipe/SwipeFeed").then((module) => module.SwipeFeed),
  {
    loading: () => <SwipePageSkeleton />,
    ssr: true
  }
);

export function LazySwipeFeed(props: SwipeFeedProps) {
  return <SwipeFeed {...props} />;
}
