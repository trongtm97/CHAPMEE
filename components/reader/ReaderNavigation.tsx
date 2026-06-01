import Link from "next/link";
import { TrackedNextChapterLink } from "@/components/reader/TrackedNextChapterLink";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderNavigationProps = {
  analyticsContext: ReaderAnalyticsContext;
  data: EpisodeReaderData;
};

export function ReaderNavigation({
  analyticsContext,
  data
}: ReaderNavigationProps) {
  return (
    <nav className="grid grid-cols-2 gap-2 chap-card p-2 sm:gap-3 sm:p-3">
      {data.previousEpisodeNumber ? (
        <Link
          className="tap-highlight inline-flex min-h-12 items-center justify-center rounded-full bg-white/[0.05] px-4 py-3 text-sm font-bold text-zinc-100 sm:min-h-14"
          href={data.previousChapterHref ?? data.storyHref}
        >
          Previous
        </Link>
      ) : (
        <span className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-600 sm:min-h-14">
          Previous
        </span>
      )}
      {data.nextEpisodeNumber ? (
        <TrackedNextChapterLink
          className="tap-highlight inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] sm:min-h-14"
          context={analyticsContext}
          href={data.nextChapterHref ?? data.storyHref}
          nextEpisodeNumber={data.nextEpisodeNumber}
        >
          Next chap
        </TrackedNextChapterLink>
      ) : (
        <span className="inline-flex min-h-12 items-center justify-center rounded-full bg-white/[0.03] px-4 py-3 text-sm font-bold text-zinc-600 sm:min-h-14">
          Next chap
        </span>
      )}
    </nav>
  );
}
