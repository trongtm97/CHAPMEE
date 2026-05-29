import { Card } from "@/components/ui";

type RankingSkeletonProps = {
  count?: number;
};

export function RankingSkeleton({ count = 5 }: RankingSkeletonProps) {
  return (
    <div className="space-y-3" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-12 w-10 rounded-xl bg-white/8" />
            <div className="h-14 w-14 rounded-full bg-white/8" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-white/8" />
              <div className="h-3 w-1/2 rounded bg-white/8" />
            </div>
          </div>
          <div className="h-4 w-full rounded bg-white/8" />
          <div className="h-4 w-2/3 rounded bg-white/8" />
        </Card>
      ))}
      <span className="sr-only">Đang tải dữ liệu xếp hạng...</span>
    </div>
  );
}
