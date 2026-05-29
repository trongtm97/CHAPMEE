import Link from "next/link";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import type { ContinueReadingItem } from "@/lib/reading/getContinueReading";

type ContinueReadingCardProps = {
  item: ContinueReadingItem;
  compact?: boolean;
  highlight?: boolean;
};

export function ContinueReadingCard({
  compact = false,
  highlight = false,
  item
}: ContinueReadingCardProps) {
  return (
    <Link
      href={`/stories/${item.story.slug}/episodes/${item.episode.episodeNumber}`}
    >
      <div
        className={`flex gap-2.5 rounded-[0.9rem] border p-2 transition hover:border-cyan-300/20 hover:bg-white/[0.03] ${
          highlight
            ? "border-cyan-300/15 bg-cyan-300/[0.04]"
            : "border-white/6 bg-white/[0.015]"
        }`}
      >
        <StoryImageThumb
          className={`relative shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5 ${
            compact ? "h-[3.25rem] w-[2.35rem]" : "h-14 w-10"
          }`}
          story={item.story}
          usage="catalogRow"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="line-clamp-2 text-[0.8125rem] font-bold leading-4 text-white">
              {item.story.title}
            </h3>
            <p className="mt-0.5 truncate text-[0.65rem] text-zinc-500">
              Chap {item.episode.episodeNumber} · {item.progressPercent}%
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200"
                style={{ width: `${Math.max(item.progressPercent, 4)}%` }}
              />
            </div>
            <span className="shrink-0 rounded-full bg-cyan-300/15 px-2 py-0.5 text-[0.625rem] font-bold text-cyan-100">
              Đọc tiếp
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
