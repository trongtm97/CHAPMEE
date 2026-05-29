import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { AdminSafetyMetrics as AdminSafetyMetricsData } from "@/lib/admin/getAdminAnalytics";

type AdminSafetyMetricsProps = {
  metrics: AdminSafetyMetricsData;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function AdminSafetyMetrics({ metrics }: AdminSafetyMetricsProps) {
  const rows = [
    { label: "Reports", value: metrics.reports },
    { label: "Hidden/deleted comments", value: metrics.hiddenComments },
    { label: "Rejected stories", value: metrics.rejectedStories },
    { label: "Rejected episodes", value: metrics.rejectedEpisodes },
    { label: "Pending community posts", value: metrics.pendingCommunityPosts }
  ];
  const hasData = rows.some((row) => row.value > 0);

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Áp lực kiểm duyệt và tín hiệu chất lượng cơ bản."
        title="Chất lượng & an toàn"
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
          description="Reports, rejected content, and hidden comments will appear here when present."
          title="Chưa có tín hiệu an toàn"
        />
      )}
    </section>
  );
}
