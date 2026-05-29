import { CommunityPostCardSkeleton } from "@/components/community/CommunityPostCardSkeleton";

type CommunityFeedSkeletonProps = {
  count?: number;
};

export function CommunityFeedSkeleton({ count = 4 }: CommunityFeedSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <CommunityPostCardSkeleton key={index} />
      ))}
    </div>
  );
}
