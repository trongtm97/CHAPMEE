import { Card, SectionHeader } from "@/components/ui";
import type { AdminPlatformMetrics } from "@/lib/admin/getAdminAnalytics";

type AdminAnalyticsOverviewProps = {
  metrics: AdminPlatformMetrics;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function AdminAnalyticsOverview({
  metrics
}: AdminAnalyticsOverviewProps) {
  const cards = [
    { label: "Users", value: metrics.users },
    { label: "Creators", value: metrics.creators },
    { label: "Stories", value: metrics.stories },
    { label: "Episodes", value: metrics.episodes },
    { label: "Pending stories", value: metrics.pendingStories },
    { label: "Pending episodes", value: metrics.pendingEpisodes },
    { label: "Approved stories", value: metrics.approvedStories },
    { label: "Comments", value: metrics.comments },
    { label: "Reports", value: metrics.reports },
    { label: "Community posts", value: metrics.communityPosts }
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Platform health counts for the selected time range."
        title="Platform"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((card) => (
          <Card className="space-y-1" key={card.label}>
            <p className="text-2xl font-bold text-white">
              {formatNumber(card.value)}
            </p>
            <p className="text-sm text-zinc-400">{card.label}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
