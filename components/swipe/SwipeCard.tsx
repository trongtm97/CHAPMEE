import { VerifiedName } from "@/components/profile/VerifiedBadge";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

type SwipeCardProps = {
  item: SwipeItem;
  index: number;
  total: number;
};

const genrePalettes = [
  "linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(12,15,22,0.98) 48%, rgba(9,12,18,1) 100%)",
  "linear-gradient(180deg, rgba(21,19,34,0.92) 0%, rgba(11,13,20,0.98) 48%, rgba(9,12,18,1) 100%)",
  "linear-gradient(180deg, rgba(14,29,33,0.92) 0%, rgba(11,13,20,0.98) 48%, rgba(9,12,18,1) 100%)",
  "linear-gradient(180deg, rgba(33,24,14,0.92) 0%, rgba(11,13,20,0.98) 48%, rgba(9,12,18,1) 100%)",
  "linear-gradient(180deg, rgba(23,14,26,0.92) 0%, rgba(11,13,20,0.98) 48%, rgba(9,12,18,1) 100%)"
];

function hashGenre(value: string | null) {
  if (!value) {
    return 0;
  }

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % genrePalettes.length;
  }

  return hash;
}

export function SwipeCard({ index, item, total }: SwipeCardProps) {
  const creatorLabel = item.creatorName ?? "Tác giả ChapMee";
  const genreLabel = item.genreName ?? "Khám phá";
  const palette = genrePalettes[hashGenre(item.genreName)];

  return (
    <article className="relative h-full min-h-full overflow-hidden" style={{ backgroundImage: palette }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(125,211,252,0.08),transparent_24%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%,transparent_78%,rgba(0,0,0,0.32))]"
      />

      <div className="relative flex h-full min-h-0 items-center px-4 py-6 pr-[5.25rem] sm:px-5 sm:pr-20">
        <div className="flex w-full max-w-[26ch] flex-col justify-center">
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/90">
            {genreLabel}
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-200/90">{item.storyTitle}</p>
          <h1 className="mt-2 text-[2rem] font-black leading-[1.02] tracking-normal text-white sm:text-[2.45rem]">
            {item.episodeTitle}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-1 text-xs font-medium text-zinc-400">
            <VerifiedName badge={item.creatorVerification} name={creatorLabel} />
            <span>
              · Chap {index + 1}/{total} · {item.episodeNumber}
            </span>
          </p>
          <div className="mt-5 max-h-[40vh] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <p className="whitespace-pre-wrap text-[1.03rem] leading-8 text-zinc-50 sm:text-[1.08rem] sm:leading-[2.05rem]">
              {item.excerpt}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
