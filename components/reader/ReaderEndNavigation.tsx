import Link from "next/link";
import { TrackedNextChapterLink } from "@/components/reader/TrackedNextChapterLink";
import { readerSectionDivider } from "@/components/reader/reader-section-styles";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";

type ReaderEndNavigationProps = {
  data: EpisodeReaderData;
  analyticsContext: ReaderAnalyticsContext;
};

function episodeHref(slug: string, episodeNumber: number) {
  return `/stories/${slug}/episodes/${episodeNumber}`;
}

export function ReaderEndNavigation({ analyticsContext, data }: ReaderEndNavigationProps) {
  const storyHref = `/stories/${data.story.slug}`;

  return (
    <section className={`${readerSectionDivider} space-y-3`}>
      {data.nextEpisodeNumber ? (
        <TrackedNextChapterLink
          className="tap-highlight flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-bold text-zinc-950 shadow-[0_10px_24px_rgba(103,232,249,0.16)]"
          context={analyticsContext}
          href={episodeHref(data.story.slug, data.nextEpisodeNumber)}
          nextEpisodeNumber={data.nextEpisodeNumber}
        >
          Đọc chương tiếp
        </TrackedNextChapterLink>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-sm leading-6 text-zinc-400">
            Bạn đã đọc tới chương mới nhất
          </p>
          <Link
            className="tap-highlight flex min-h-10 w-full items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100"
            href={storyHref}
          >
            Theo dõi để nhận chương mới
          </Link>
        </div>
      )}

      <nav
        aria-label="Điều hướng chương"
        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"
      >
        {data.previousEpisodeNumber ? (
          <>
            <Link
              className="font-medium text-zinc-500 hover:text-zinc-200"
              href={episodeHref(data.story.slug, data.previousEpisodeNumber)}
            >
              Chương trước
            </Link>
            <span aria-hidden className="text-zinc-700">
              ·
            </span>
          </>
        ) : null}
        <Link className="font-medium text-zinc-500 hover:text-zinc-200" href={storyHref}>
          ← Về trang truyện
        </Link>
      </nav>
    </section>
  );
}
