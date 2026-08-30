import { formatReviewScore } from "@/components/story/reviews/review-ui-utils";
import type { StoryReviewStatsView } from "@/types/story-review";

type StoryReviewSummaryProps = {
  stats: StoryReviewStatsView;
};

const CRITERIA: Array<{ key: keyof StoryReviewStatsView; label: string }> = [
  { key: "avgPlot", label: "Cốt truyện" },
  { key: "avgCharacter", label: "Tuyến nhân vật" },
  { key: "avgWritingStyle", label: "Văn phong" },
  { key: "avgWorldbuilding", label: "Bối cảnh thế giới" }
];

export function StoryReviewSummary({ stats }: StoryReviewSummaryProps) {
  if (stats.reviewCount <= 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-zinc-500">
        Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận chi tiết về truyện này.
      </p>
    );
  }

  const totalDistribution =
    stats.ratingDistribution[1] +
    stats.ratingDistribution[2] +
    stats.ratingDistribution[3] +
    stats.ratingDistribution[4] +
    stats.ratingDistribution[5];

  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Trung bình
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-amber-200">
            {formatReviewScore(stats.avgOverall)}
            <span className="ml-1 text-base font-medium text-zinc-500">/ 5</span>
          </p>
        </div>
        <p className="text-sm text-zinc-400">
          {stats.reviewCount} đánh giá
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {CRITERIA.map((item) => (
          <div
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2"
            key={item.label}
          >
            <span className="text-sm text-zinc-300">{item.label}</span>
            <span className="text-sm font-semibold tabular-nums text-zinc-100">
              {formatReviewScore(stats[item.key] as number | null)}
            </span>
          </div>
        ))}
      </div>

      {totalDistribution > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Phân bố sao
          </p>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.ratingDistribution[star as 1 | 2 | 3 | 4 | 5];
            const percent = Math.round((count / totalDistribution) * 100);
            return (
              <div className="flex items-center gap-2 text-xs" key={star}>
                <span className="w-8 shrink-0 text-zinc-400">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-amber-300/70"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums text-zinc-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
