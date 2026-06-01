import type {
  StudioAnalyticsDelta,
  StudioAnalyticsOverview
} from "@/types/studio-analytics";
import { analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

type KpiGridProps = {
  deltas: Record<string, StudioAnalyticsDelta>;
  overview: StudioAnalyticsOverview;
};

export function KpiGrid({ deltas, overview }: KpiGridProps) {
  const cards = [
    {
      delta: deltas.reads,
      hint: "Từ sự kiện mở truyện/chương",
      key: "reads",
      label: "Lượt đọc",
      value: formatNumber(overview.reads)
    },
    {
      delta: deltas.saves,
      hint: "Lượt lưu vào tủ sách",
      key: "saves",
      label: "Lượt lưu",
      value: formatNumber(overview.saves)
    },
    {
      delta: deltas.comments,
      hint: "Bình luận gốc mới",
      key: "comments",
      label: "Bình luận mới",
      value: formatNumber(overview.comments)
    },
    {
      delta: deltas.follows,
      hint: "Người theo dõi mới",
      key: "follows",
      label: "Theo dõi mới",
      value: formatNumber(overview.newFollows)
    },
    {
      delta: null,
      hint:
        overview.uniqueReaders > 0
          ? "Độc giả khác nhau trong kỳ"
          : "Chưa có dữ liệu độc giả duy nhất",
      key: "unique",
      label: "Độc giả duy nhất",
      value:
        overview.uniqueReaders > 0
          ? formatNumber(overview.uniqueReaders)
          : "—",
      hidden: overview.uniqueReaders === 0 && overview.reads === 0
    },
    {
      delta: null,
      hint: "Lượt xem nội dung Reels",
      key: "reelsViews",
      label: "Lượt xem Reels",
      value: formatNumber(overview.reelsViews)
    },
    {
      delta: null,
      hint:
        overview.reelsCtr !== null
          ? `${overview.reelsCtr}% chuyển sang đọc truyện`
          : "Chưa đủ lượt xem Reels",
      key: "ctr",
      label: "CTR Reels → đọc",
      value:
        overview.reelsCtr !== null ? `${overview.reelsCtr}%` : "—"
    },
    {
      delta: null,
      hint: overview.hasMonetization
        ? "Từ giao dịch hoàn tất"
        : "Chưa có dữ liệu doanh thu",
      key: "revenue",
      label: "Doanh thu ước tính",
      value:
        overview.hasMonetization && overview.revenueVnd !== null
          ? `${formatNumber(overview.revenueVnd)} ₫`
          : overview.hasMonetization
            ? "Chưa có dữ liệu"
            : "Chưa bật kiếm tiền"
    }
  ].filter((card) => !card.hidden);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div className={`${analyticsCard} space-y-1.5 p-4`} key={card.key}>
          <p className="text-xs font-medium text-zinc-500">{card.label}</p>
          <p className="text-2xl font-bold tabular-nums text-white">{card.value}</p>
          <p className="text-[11px] leading-snug text-zinc-500">{card.hint}</p>
          {card.delta ? (
            <p
              className={`text-xs font-semibold ${
                card.delta.value !== null && card.delta.value > 0
                  ? "text-emerald-300"
                  : card.delta.value !== null && card.delta.value < 0
                    ? "text-amber-300"
                    : "text-zinc-500"
              }`}
            >
              {card.delta.label}
            </p>
          ) : (
            <p className="text-xs text-zinc-600">Chưa đủ dữ liệu so sánh</p>
          )}
        </div>
      ))}
    </div>
  );
}
