import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { StudioStoryAnalytics } from "@/lib/studio/get-studio-analytics";

type StoryPerformanceTableProps = {
  stories: StudioStoryAnalytics[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function StoryPerformanceTable({ stories }: StoryPerformanceTableProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Hiệu quả theo truyện" />
      {stories.length === 0 ? (
        <EmptyState
          description="Khi truyện có lượt đọc hoặc tương tác, dữ liệu sẽ hiển thị tại đây."
          title="Chưa có dữ liệu truyện"
        />
      ) : (
        <div className="space-y-3">
          {stories.map((story) => (
            <Card className="space-y-3 p-4" key={story.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{story.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {story.displayStatus} · Cập nhật {formatDate(story.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                    href={story.chaptersHref}
                  >
                    Xem chương
                  </Link>
                  <Link
                    className="rounded-full bg-cyan-300/90 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-200"
                    href={story.studioHref}
                  >
                    Mở trong Studio
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Metric label="Lượt đọc" value={formatNumber(story.reads)} />
                <Metric label="Lượt lưu" value={formatNumber(story.saves)} />
                <Metric label="Bình luận" value={formatNumber(story.comments)} />
                <Metric
                  label="Doanh thu"
                  value={
                    story.revenueVnd === null
                      ? "—"
                      : `${formatNumber(story.revenueVnd)} ₫`
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
