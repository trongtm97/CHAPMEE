"use client";

import { AnalyticsChartsSection } from "@/components/studio/analytics/dashboard/AnalyticsChartsSection";
import { AnalyticsEmptyState } from "@/components/studio/analytics/dashboard/AnalyticsEmptyState";
import { AnalyticsFilters } from "@/components/studio/analytics/dashboard/AnalyticsFilters";
import { AnalyticsHeader } from "@/components/studio/analytics/dashboard/AnalyticsHeader";
import { CommunitySummarySection } from "@/components/studio/analytics/dashboard/CommunitySummarySection";
import { ContentHealthSection } from "@/components/studio/analytics/dashboard/ContentHealthSection";
import { InsightPanel } from "@/components/studio/analytics/dashboard/InsightPanel";
import { KpiGrid } from "@/components/studio/analytics/dashboard/KpiGrid";
import { ReelsPerformanceSection } from "@/components/studio/analytics/dashboard/ReelsPerformanceSection";
import { TopChaptersSection } from "@/components/studio/analytics/dashboard/TopChaptersSection";
import { TopStoriesSection } from "@/components/studio/analytics/dashboard/TopStoriesSection";
import { ErrorState } from "@/components/ui";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioAnalyticsContentFilter,
  StudioAnalyticsPageData,
  StudioAnalyticsRange
} from "@/types/studio-analytics";

type StudioAnalyticsPageProps = {
  activeContent: StudioAnalyticsContentFilter;
  activeRange: StudioAnalyticsRange;
  activeStoryId?: string;
  data: StudioAnalyticsPageData;
  query: Record<string, string | undefined>;
};

export function StudioAnalyticsPage({
  activeContent,
  activeRange,
  activeStoryId,
  data,
  query
}: StudioAnalyticsPageProps) {
  const basePath = studioPath("/analytics");

  if (data.error) {
    return <ErrorState message={data.error} title="Không tải được thống kê" />;
  }

  const showStories =
    activeContent === "all" || activeContent === "story";
  const showChapters =
    activeContent === "all" || activeContent === "chapter";
  const showReels = activeContent === "all" || activeContent === "reels";
  const showComments =
    activeContent === "all" || activeContent === "comments";

  const showDashboard = data.hasAnyData || data.storyOptions.length > 0;

  return (
    <div className="space-y-6 pb-8">
      <AnalyticsHeader updatedAt={data.updatedAt} />

      <AnalyticsFilters
        activeContent={activeContent}
        activeRange={activeRange}
        activeStoryId={activeStoryId}
        basePath={basePath}
        query={query}
        search={data.search}
        stories={data.storyOptions}
      />

      {!showDashboard ? (
        <AnalyticsEmptyState />
      ) : (
        <>
          <KpiGrid deltas={data.overviewDeltas} overview={data.overview} />

          <InsightPanel
            insights={data.insights}
            totalHealthIssues={data.healthIssuesTotal}
          />

          {activeContent !== "comments" ? (
            <AnalyticsChartsSection
              engagementTimeline={data.engagementTimeline}
              readTimeline={data.readTimeline}
              sourceBreakdown={data.sourceBreakdown}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {showStories ? <TopStoriesSection stories={data.stories} /> : null}
            {showChapters ? <TopChaptersSection chapters={data.chapters} /> : null}
          </div>

          {showReels ? (
            <ReelsPerformanceSection reels={data.reels} summary={data.reelsSummary} />
          ) : null}

          {showComments ? (
            <CommunitySummarySection community={data.community} />
          ) : null}

          <ContentHealthSection
            issues={data.healthIssues}
            total={data.healthIssuesTotal}
          />
        </>
      )}
    </div>
  );
}
