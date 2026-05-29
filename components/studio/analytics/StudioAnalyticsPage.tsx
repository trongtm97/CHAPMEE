import Link from "next/link";
import { AnalyticsOverviewCards } from "@/components/studio/analytics/AnalyticsOverviewCards";
import { AnalyticsRangeTabs } from "@/components/studio/analytics/AnalyticsRangeTabs";
import { ChapterPerformanceTable } from "@/components/studio/analytics/ChapterPerformanceTable";
import { StoryPerformanceTable } from "@/components/studio/analytics/StoryPerformanceTable";
import { SwipePerformanceTable } from "@/components/studio/analytics/SwipePerformanceTable";
import { EmptyState, ErrorState } from "@/components/ui";
import type { StudioAnalyticsData } from "@/lib/studio/get-studio-analytics";
import { studioPath } from "@/lib/studio/constants";

type StudioAnalyticsPageProps = {
  data: StudioAnalyticsData;
};

export function StudioAnalyticsPage({ data }: StudioAnalyticsPageProps) {
  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được thống kê" />;
  }

  if (!data.hasAnyData) {
    return (
      <div className="space-y-6">
        <AnalyticsRangeTabs activeRange={data.activeRange} />
        <EmptyState
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950"
              href={studioPath("/stories")}
            >
              Quản lý truyện
            </Link>
          }
          description="Khi truyện hoặc nội dung Swipe của bạn có lượt đọc, dữ liệu sẽ xuất hiện tại đây."
          title="Chưa có thống kê."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnalyticsRangeTabs activeRange={data.activeRange} />
      <AnalyticsOverviewCards overview={data.overview} />
      <StoryPerformanceTable stories={data.stories} />
      <ChapterPerformanceTable chapters={data.chapters} />
      <SwipePerformanceTable swipes={data.swipes} />
    </div>
  );
}
