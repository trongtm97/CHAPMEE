import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import type { StudioReelsAnalytics } from "@/lib/studio/get-studio-analytics";

type ReelsPerformanceTableProps = {
  reels: StudioReelsAnalytics[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function ReelsPerformanceTable({ reels }: ReelsPerformanceTableProps) {
  if (reels.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Lượt xem và CTA từ nội dung Reels và sự kiện feed khi có."
        title="Hiệu quả Reels"
      />
      <div className="space-y-3">
        {reels.map((reel) => (
          <Card className="space-y-3 p-4" key={reel.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold text-white">{reel.hook}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {reel.storyTitle} · {reel.chapterLabel}
                </p>
              </div>
              <Link
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                href={reel.editHref}
              >
                Sửa
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Metric label="Lượt xem" value={formatNumber(reel.views)} />
              <Metric label="Lượt bấm CTA" value={formatNumber(reel.ctaClicks)} />
              <Metric
                label="Tỷ lệ bấm CTA"
                value={
                  reel.views === 0
                    ? "Chưa có lượt xem"
                    : reel.ctaRate === null
                      ? "0%"
                      : `${reel.ctaRate}%`
                }
              />
            </div>
          </Card>
        ))}
      </div>
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
