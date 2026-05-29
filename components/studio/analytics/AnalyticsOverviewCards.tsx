import { Card, SectionHeader } from "@/components/ui";
import type { StudioAnalyticsOverview } from "@/lib/studio/get-studio-analytics";

type AnalyticsOverviewCardsProps = {
  overview: StudioAnalyticsOverview;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

function formatMetric(value: number | null, suffix = "") {
  if (value === null) {
    return "Chưa có dữ liệu";
  }

  return `${formatNumber(value)}${suffix}`;
}

export function AnalyticsOverviewCards({ overview }: AnalyticsOverviewCardsProps) {
  const cards = [
    { label: "Lượt đọc", value: formatMetric(overview.reads) },
    {
      label: "Người đọc duy nhất",
      value: formatMetric(overview.uniqueReaders)
    },
    { label: "Lượt lưu truyện", value: formatMetric(overview.saves) },
    { label: "Bình luận mới", value: formatMetric(overview.comments) },
    { label: "Người theo dõi mới", value: formatMetric(overview.newFollows) },
    {
      label: "Lượt bấm từ Swipe",
      value: formatMetric(overview.swipeCtaClicks)
    },
    {
      label: "Doanh thu",
      value: overview.hasMonetization
        ? overview.revenueVnd === null
          ? "Chưa có dữ liệu"
          : `${formatNumber(overview.revenueVnd)} ₫`
        : "Chưa có dữ liệu"
    },
    {
      label: "Hoàn thành chương",
      value:
        overview.completedChapters > 0 || overview.completionRate > 0
          ? `${formatNumber(overview.completedChapters)} (${overview.completionRate}%)`
          : "Chưa có dữ liệu"
    }
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Số liệu từ hệ thống theo dõi thật — không ước lượng."
        title="Tổng quan"
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card className="space-y-1 p-4" key={card.label}>
            <p className="text-xl font-bold text-white sm:text-2xl">{card.value}</p>
            <p className="text-xs text-zinc-400 sm:text-sm">{card.label}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
