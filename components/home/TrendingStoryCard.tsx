import Link from "next/link";
import { Card } from "@/components/ui";
import { StoryCover } from "@/components/stories/StoryCover";
import type { HomeStory } from "@/lib/stories/getHomeStories";

type TrendingStoryCardProps = {
  story: HomeStory;
  rank: number;
};

function getRankingReason(rank: number) {
  if (rank === 1) return "Đang được chú ý";
  if (rank === 2) return "Nhiều lượt đọc";
  if (rank === 3) return "Được lưu nhiều";
  return "Đang có bình luận";
}

export function TrendingStoryCard({ rank, story }: TrendingStoryCardProps) {
  return (
    <Link className="tap-highlight block" href={`/stories/${story.slug}`}>
      <Card className="border-white/8 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 items-start gap-2">
            <div className="mt-1 flex size-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-[0.95rem] font-black text-cyan-100">
              #{rank}
            </div>
            <StoryCover
              className="shrink-0"
              coverUrl={story.coverUrl}
              genreName={story.genreName}
              genreSlug={story.genreSlug}
              size="small"
              title={story.title}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {story.genreName ? (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
                  {story.genreName}
                </span>
              ) : null}
              <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-cyan-200">
                {getRankingReason(rank)}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="line-clamp-2 text-[1.02rem] font-black leading-6 tracking-normal text-white sm:text-[1.12rem] sm:leading-7">
                {story.title}
              </h3>
              <p className="truncate text-[0.9rem] font-medium text-zinc-300">
                {story.creatorName ?? "Tác giả ChapMee"}
              </p>
            </div>

            <p className="line-clamp-2 text-[0.95rem] leading-6 text-zinc-200">
              {story.hook ?? "Một truyện đang được người đọc chú ý."}
            </p>

            <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
              <span className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_12px_22px_rgba(103,232,249,0.14)]">
                Đọc ngay
              </span>
              <span className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                #{rank}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
