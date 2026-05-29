import { Card } from "@/components/ui";
import type { CreatorDashboardOverview } from "@/types/creator";

type CreatorOverviewCardsProps = {
  overview: CreatorDashboardOverview;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CreatorOverviewCards({ overview }: CreatorOverviewCardsProps) {
  const cards = [
    {
      label: "Truyện đang viết",
      value: overview.activeStories,
      hint: "Nháp hoặc có chương đang soạn"
    },
    {
      label: "Chương nháp",
      value: overview.draftChapters,
      hint: "Chưa gửi duyệt"
    },
    {
      label: "Lịch đăng sắp tới",
      value: overview.scheduledUpcoming,
      hint: overview.scheduledUpcoming === 0 ? "Chưa có lịch" : "Trong 7 ngày tới"
    },
    {
      label: "Lượt đọc 7 ngày",
      value: overview.reads7d,
      hint: "Từ dữ liệu đọc truyện"
    }
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {cards.map((card) => (
        <Card className="space-y-1 p-3 sm:p-4" key={card.label}>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-zinc-500 sm:text-xs">
            {card.label}
          </p>
          <p className="text-2xl font-black text-white sm:text-3xl">
            {formatNumber(card.value)}
          </p>
          <p className="text-[0.7rem] leading-snug text-zinc-500 sm:text-xs">
            {card.hint}
          </p>
        </Card>
      ))}
    </div>
  );
}
