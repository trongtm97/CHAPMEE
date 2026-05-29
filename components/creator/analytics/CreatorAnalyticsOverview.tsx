import { Card, SectionHeader } from "@/components/ui";
import type { CreatorAnalyticsOverview as CreatorAnalyticsOverviewData } from "@/lib/creator/getCreatorAnalytics";

type CreatorAnalyticsOverviewProps = {
  overview: CreatorAnalyticsOverviewData;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CreatorAnalyticsOverview({
  overview
}: CreatorAnalyticsOverviewProps) {
  const cards = [
    { label: "Mo story", value: overview.storyOpens },
    { label: "Bat dau doc", value: overview.episodeStarts },
    { label: "Hoan thanh chap", value: overview.completedChapters },
    { label: "Ti le hoan thanh", value: `${overview.completionRate}%` },
    { label: "Luot luu", value: overview.saves },
    { label: "Follower moi", value: overview.follows },
    { label: "Binh luan", value: overview.comments },
    { label: "Report", value: overview.reports }
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Chi tinh tren truyen va chap thuoc creator profile cua ban."
        title="Tong quan"
      />
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <Card className="space-y-1" key={card.label}>
            <p className="text-2xl font-bold text-white">
              {typeof card.value === "number"
                ? formatNumber(card.value)
                : card.value}
            </p>
            <p className="text-sm text-zinc-400">{card.label}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
