import { Card, SectionHeader } from "@/components/ui";
import type { CreatorDashboardStats } from "@/lib/creator/getCreatorDashboard";

type CreatorStatsCardsProps = {
  stats: CreatorDashboardStats;
};

const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export function CreatorStatsCards({ stats }: CreatorStatsCardsProps) {
  const cards = [
    { label: "Truyện", value: stats.totalStories },
    { label: "Chap", value: stats.totalEpisodes },
    { label: "Đang chờ duyệt", value: stats.pendingStories + stats.pendingEpisodes },
    { label: "Lượt đọc", value: stats.reads },
    { label: "Lượt lưu", value: stats.saves },
    { label: "Follower", value: stats.followers },
    { label: "Bình luận", value: stats.comments }
  ];

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Các chỉ số đang giữ ở mức MVP, ưu tiên count cơ bản trước."
        title="Tổng quan"
      />
      <div className="grid grid-cols-2 gap-3">
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
