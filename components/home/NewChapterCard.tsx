import Link from "next/link";
import { Card } from "@/components/ui";
import { StoryCover } from "@/components/stories/StoryCover";
import type { NewChapterItem } from "@/lib/stories/getHomeStories";

type NewChapterCardProps = {
  chapter: NewChapterItem;
};

export function NewChapterCard({ chapter }: NewChapterCardProps) {
  return (
    <Link
      className="tap-highlight block"
      href={`/stories/${chapter.story.slug}/episodes/${chapter.episodeNumber}`}
    >
      <Card className="border-white/8 bg-white/[0.035] transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[var(--surface-soft)]">
        <div className="flex items-start gap-3">
          <StoryCover
            className="shrink-0"
            coverUrl={chapter.story.coverUrl}
            genreName={chapter.story.genreName}
            genreSlug={chapter.story.genreSlug}
            size="small"
            title={chapter.story.title}
          />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {chapter.story.genreName ? (
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-cyan-200">
                  {chapter.story.genreName}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
                Chap mới
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="line-clamp-2 text-[1.02rem] font-black leading-6 text-white sm:text-[1.1rem] sm:leading-7">
                {chapter.story.title}
              </h3>
              <p className="truncate text-[0.9rem] font-medium text-zinc-300">
                {chapter.story.creatorName ?? "Tác giả ChapMee"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[0.98rem] font-semibold leading-6 text-cyan-100">
                Chap {chapter.episodeNumber}: {chapter.title}
              </p>
              <p className="line-clamp-2 text-[0.95rem] leading-6 text-zinc-300">
                {chapter.excerpt ?? chapter.story.hook ?? "Một chap mới vừa ra mắt."}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
              <span className="inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-4 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_12px_22px_rgba(103,232,249,0.14)]">
                Mở chap
              </span>
              <span className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {chapter.story.episodeCount} chap
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
