import Link from "next/link";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type { StoryReadingProgress } from "@/types/chapter";

type ContinueReadingCardProps = {
  progress: StoryReadingProgress;
  storySlug: string;
};

export function ContinueReadingCard({ progress, storySlug }: ContinueReadingCardProps) {
  return (
    <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/[0.06] p-3.5">
      <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">Đọc tiếp</p>
      <p className="mt-1 line-clamp-1 text-sm text-zinc-200">
        Chương {progress.episodeNumber} · {progress.episodeTitle}
      </p>
      <Link
        className="tap-highlight mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950"
        href={getStoryChapterHref(storySlug, progress.episodeNumber)}
      >
        Tiếp tục đọc
      </Link>
    </div>
  );
}
