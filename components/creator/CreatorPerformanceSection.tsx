import { Card } from "@/components/ui";
import type { CreatorDashboardPerformance7d } from "@/types/creator";

type CreatorPerformanceSectionProps = {
  performance: CreatorDashboardPerformance7d;
  hasStories: boolean;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function CreatorPerformanceSection({
  hasStories,
  performance
}: CreatorPerformanceSectionProps) {
  const metrics = [
    { label: "Lượt đọc 7 ngày", value: performance.reads },
    { label: "Lượt lưu", value: performance.saves },
    { label: "Bình luận mới", value: performance.comments },
    { label: "Người theo dõi mới", value: performance.newFollowers }
  ];

  const allZero = metrics.every((metric) => metric.value === 0);

  if (!hasStories) {
    return (
      <Card className="p-4">
        <p className="text-sm text-zinc-400">
          Đăng truyện đầu tiên để bắt đầu theo dõi hiệu quả.
        </p>
      </Card>
    );
  }

  if (allZero) {
    return (
      <Card className="space-y-2 p-4">
        <p className="text-sm text-zinc-300">Chưa có tương tác trong 7 ngày qua.</p>
        <p className="text-xs text-zinc-500">
          Số liệu lấy từ lượt đọc, lưu truyện, bình luận và theo dõi tác giả — không
          dùng số ước lượng.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {metrics.map((metric) => (
        <Card className="space-y-1 p-3" key={metric.label}>
          <p className="text-xl font-black text-white sm:text-2xl">
            {formatNumber(metric.value)}
          </p>
          <p className="text-xs text-zinc-500">{metric.label}</p>
        </Card>
      ))}
    </div>
  );
}
