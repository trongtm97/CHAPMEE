import Link from "next/link";
import { TrackedNextChapterLink } from "@/components/reader/TrackedNextChapterLink";
import { readerSectionDivider } from "@/components/reader/reader-section-styles";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderEndNavigationProps = {
  data: EpisodeReaderData;
  analyticsContext: ReaderAnalyticsContext;
  onPrefetchNext?: () => void;
  onPrefetchPrevious?: () => void;
};

export function ReaderEndNavigation({
  analyticsContext,
  data,
  onPrefetchNext,
  onPrefetchPrevious
}: ReaderEndNavigationProps) {
  const storyHref = data.storyHref;

  return (
    <section aria-label="Điều hướng cuối chương" className={`${readerSectionDivider} space-y-4`}>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.previousEpisodeNumber && data.previousChapterHref ? (
          <Link
            className="tap-highlight flex min-h-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] px-4 text-sm font-semibold text-zinc-300 hover:bg-white/[0.05]"
            href={data.previousChapterHref}
            onFocus={onPrefetchPrevious}
            onMouseEnter={onPrefetchPrevious}
          >
            ← Chương {data.previousEpisodeNumber}
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {data.nextEpisodeNumber && data.nextChapterHref ? (
          <TrackedNextChapterLink
            className="tap-highlight flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-bold text-zinc-950 shadow-[0_10px_24px_rgba(103,232,249,0.16)] sm:col-start-2"
            context={analyticsContext}
            href={data.nextChapterHref}
            nextEpisodeNumber={data.nextEpisodeNumber}
            onPrefetchIntent={onPrefetchNext}
          >
            Chương {data.nextEpisodeNumber} →
          </TrackedNextChapterLink>
        ) : null}
      </div>

      {!data.nextEpisodeNumber ? (
        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-center">
          <p className="text-sm leading-6 text-zinc-400">
            Bạn đã đọc tới chương mới nhất của truyện này.
          </p>
          <Link
            className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-semibold text-cyan-100"
            href={storyHref}
          >
            Theo dõi truyện để nhận chương mới
          </Link>
        </div>
      ) : null}

      <p className="text-center">
        <Link
          className="text-sm font-medium text-zinc-500 hover:text-zinc-200"
          href={storyHref}
        >
          ← Về trang truyện
        </Link>
      </p>
    </section>
  );
}
