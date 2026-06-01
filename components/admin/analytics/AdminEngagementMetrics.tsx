import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { AdminEngagementMetrics as AdminEngagementMetricsData } from "@/lib/admin/getAdminAnalytics";

type AdminEngagementMetricsProps = {
  metrics: AdminEngagementMetricsData;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function AdminEngagementMetrics({
  metrics
}: AdminEngagementMetricsProps) {
  const rows = [
    { label: "open_story", value: metrics.openStory },
    { label: "start_reading", value: metrics.startReading },
    { label: "complete_chap", value: metrics.completeChap },
    { label: "next_chap_click", value: metrics.nextChapClick },
    { label: "feed_impression", value: metrics.feedImpression },
    { label: "feed_read_more", value: metrics.feedReadMore }
  ];
  const hasData = rows.some((row) => row.value > 0);

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Sự kiện đọc và Reels từ analytics_events."
        title="Tương tác đọc"
      />
      {hasData ? (
        <Card className="p-0">
          <div className="divide-y divide-zinc-800">
            {rows.map((row) => (
              <div
                className="flex items-center justify-between gap-4 px-4 py-3"
                key={row.label}
              >
                <span className="text-sm font-medium text-zinc-300">
                  {row.label}
                </span>
                <span className="text-base font-semibold text-white">
                  {formatNumber(row.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <EmptyState
          description="Reader events will appear here after users open stories, read chapters, or use Reels."
          title="Chưa có sự kiện tương tác"
        />
      )}
    </section>
  );
}
