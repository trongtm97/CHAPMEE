import { TrackedStoryLink } from "@/components/tracking/TrackedStoryLink";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import { Card, Badge } from "@/components/ui";
import type { StoryRankingItem } from "@/types/ranking";

type StoryRankingCardProps = {
  item: StoryRankingItem;
};

export function StoryRankingCard({ item }: StoryRankingCardProps) {
  const rankColor =
    item.rank === 1
      ? "text-amber-300"
      : item.rank === 2
        ? "text-zinc-200"
        : item.rank === 3
          ? "text-orange-400"
          : "text-zinc-400";

  const rankBg =
    item.rank <= 3
      ? "bg-white/10 border-white/15"
      : "bg-white/[0.04] border-white/8";

  return (
    <TrackedStoryLink
      className="tap-highlight block"
      href={getStoryDetailHref({ slug: item.slug, public_code: item.publicCode })}
      position={item.rank}
      storyId={item.id}
      surface="ranking"
    >
      <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-center ${rankBg}`}
          >
            <span className={`text-sm font-black leading-none ${rankColor}`}>
              {item.rank}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-black leading-6 tracking-normal text-white">
              {item.title}
            </h3>
            <p className="mt-1 truncate text-xs font-medium text-zinc-400">
              {item.creatorName ?? "Tác giả ChapMee"}
              {item.genreName ? ` / ${item.genreName}` : ""}
            </p>
          </div>
          {item.score > 0 && (
            <Badge variant="default">{item.score} điểm</Badge>
          )}
        </div>
        {item.hook && (
          <p className="line-clamp-3 text-[0.98rem] leading-7 text-zinc-200">
            {item.hook}
          </p>
        )}
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
          Đọc ngay
        </span>
      </Card>
    </TrackedStoryLink>
  );
}
