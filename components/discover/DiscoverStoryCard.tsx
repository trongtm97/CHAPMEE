import Link from "next/link";
import { Card } from "@/components/ui";
import type { DiscoverStory } from "@/lib/discover/getDiscoverData";

type DiscoverStoryCardProps = {
  story: DiscoverStory;
};

export function DiscoverStoryCard({ story }: DiscoverStoryCardProps) {
  return (
    <Link className="tap-highlight block" href={`/stories/${story.slug}`}>
      <Card className="space-y-3 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/25 to-sky-300/10 text-base font-black text-white">
            {story.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-lg font-black leading-6 tracking-normal text-white">
              {story.title}
            </h3>
            <p className="mt-1 truncate text-xs font-medium text-zinc-400">
              {story.creatorName ?? "Tác giả ChapMee"}
              {story.genreName ? ` / ${story.genreName}` : ""}
            </p>
          </div>
        </div>
        <p className="line-clamp-3 text-[0.98rem] leading-7 text-zinc-200">
          {story.hook ?? story.shortDescription ?? "Một truyện mới đang chờ bạn."}
        </p>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black uppercase tracking-[0.12em] text-zinc-950">
          Đọc ngay
        </span>
      </Card>
    </Link>
  );
}
