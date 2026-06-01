import type { ReelsFeedProps } from "@/components/reels/ReelsFeed";
import dynamic from "next/dynamic";
import { ReelsPageSkeleton } from "@/components/ui/navigation-skeletons";

const ReelsFeed = dynamic(
  () => import("@/components/reels/ReelsFeed").then((module) => module.ReelsFeed),
  {
    loading: () => <ReelsPageSkeleton />,
    ssr: true
  }
);

export type LazyReelsFeedProps = ReelsFeedProps;

export function LazyReelsFeed(props: LazyReelsFeedProps) {
  return <ReelsFeed {...props} />;
}
