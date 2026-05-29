import Link from "next/link";
import { SwipeBackground } from "@/components/swipe/SwipeBackground";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

type SwipeTextSceneProps = {
  item: SwipeItem;
};

export function SwipeTextScene({ item }: SwipeTextSceneProps) {
  const genreLabel = item.genreName ?? "Khám phá";

  return (
    <article className="relative flex h-full min-h-full flex-col overflow-hidden">
      <SwipeBackground
        genreName={item.genreName}
        imageUrl={item.backgroundImageUrl}
      />

      <div className="relative flex h-full min-h-full flex-col justify-center px-5 pb-[calc(11.6rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.4rem)] pr-[5.8rem] sm:px-6 sm:pr-[6.4rem] lg:justify-start lg:pb-36 lg:pt-16 lg:pr-10">
        <div className="max-w-[26rem] space-y-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="chap-pill px-3 py-1 text-[0.64rem] font-bold uppercase tracking-[0.2em] text-cyan-100">
              {genreLabel}
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="line-clamp-3 max-w-[24rem] text-[1.95rem] font-black leading-[1.06] tracking-[-0.03em] text-white sm:text-[2.15rem] lg:text-[1.75rem] lg:leading-[1.15]">
              {item.hookTitle}
            </h1>
            <p className="line-clamp-[10] max-w-[24rem] text-[1rem] leading-7 text-zinc-100/92 sm:text-[1.06rem] sm:leading-8 lg:text-[0.98rem] lg:leading-7">
              {item.excerpt}
            </p>
          </div>
        </div>
      </div>

      <aside className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden px-6 pb-6 lg:block">
        <div className="pointer-events-auto rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,16,0.72),rgba(6,10,16,0.92))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur-md">
          <div className="space-y-1">
            <p className="line-clamp-1 text-[1rem] font-bold text-white">{item.storyTitle}</p>
            <p className="line-clamp-1 text-[0.8rem] text-zinc-300/82">
              {item.episodeNumber > 0
                ? `Chương ${item.episodeNumber}${item.episodeTitle ? ` · ${item.episodeTitle}` : ""}`
                : item.episodeTitle || "Truyện"}
              {item.creatorName ? (
                <>
                  {" · "}
                  {item.creatorName}
                  <VerifiedBadge
                    badge={item.creatorVerification}
                    className="ml-0.5 inline align-middle"
                    size="xs"
                  />
                </>
              ) : null}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[0.8rem] font-semibold text-zinc-100 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]"
              href={item.readMoreHref}
            >
              {item.ctaLabel || "Đọc tiếp"}
            </Link>
            <Link
              className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 py-2 text-[0.82rem] font-black text-zinc-950 transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-100"
              href={`/stories/${item.storySlug}`}
            >
              Vào truyện
            </Link>
          </div>
        </div>
      </aside>
    </article>
  );
}
