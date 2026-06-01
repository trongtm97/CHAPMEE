import Link from "next/link";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import { StoryImageThumb } from "@/components/common/StoryImageView";
import type { ContinueReadingEnriched } from "@/types/library";

type LibraryContinueCardProps = {
  item: ContinueReadingEnriched;
};

export function LibraryContinueCard({ item }: LibraryContinueCardProps) {
  const progressWidth = `${Math.min(100, Math.max(item.progressPercent, 2))}%`;

  return (
    <article className="rounded-xl border border-white/6 bg-white/[0.02] p-2">
      <div className="flex gap-2.5">
        <Link
          href={getStoryDetailHref({
            slug: item.story.slug,
            public_code: item.story.publicCode
          })}
        >
          <StoryImageThumb
            className="relative h-[3.1rem] w-[2.2rem] shrink-0 overflow-hidden rounded-md border border-white/8 bg-white/5"
            story={item.story}
            usage="catalogRow"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
          href={getStoryDetailHref({
            slug: item.story.slug,
            public_code: item.story.publicCode
          })}
        >
                <h3 className="line-clamp-1 text-[0.8125rem] font-bold text-white">
                  {item.story.title}
                </h3>
              </Link>
              <p className="mt-0.5 truncate text-[0.65rem] text-zinc-500">
                Chap {item.episode.episodeNumber} · {item.progressPercent}%
              </p>
            </div>
            {item.hasNewChapter ? (
              <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-200">
                Có chương mới
              </span>
            ) : item.isCaughtUp ? (
              <span className="shrink-0 max-w-[5.5rem] text-right text-[0.58rem] leading-tight text-zinc-500">
                Đã đọc tới chương mới nhất
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className="h-full max-w-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200"
              style={{ width: progressWidth }}
            />
          </div>

          <div className="mt-1.5 flex justify-end">
            <Link
              className="inline-flex min-h-7 items-center rounded-full bg-cyan-300 px-2.5 text-[0.65rem] font-bold text-zinc-950 transition hover:bg-cyan-200"
              href={getStoryChapterHref(
                { slug: item.story.slug, public_code: item.story.publicCode },
                { slug: item.episode.slug, public_code: item.episode.publicCode }
              )}
            >
              Đọc tiếp
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
