import Link from "next/link";
import { TrackedReelsLink } from "@/components/reels/TrackedReelsLink";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type ReelCtaCardProps = {
  context: ReelsAnalyticsContext;
  ctaLabel: string;
  onCtaExperimentClick?: () => void;
};

export function ReelCtaCard({ context, ctaLabel, onCtaExperimentClick }: ReelCtaCardProps) {
  const { item } = context;
  const chapterLine =
    item.contentSource === "chapter" && item.episodeNumber > 0
      ? `Chương ${item.episodeNumber}${item.episodeTitle ? ` · ${item.episodeTitle}` : ""}`
      : item.contentSource === "chapter"
        ? item.episodeTitle || "Chương"
        : "Truyện";

  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,16,0.78),rgba(6,10,16,0.94))] px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.32)] backdrop-blur-md">
      <div className="min-w-0 space-y-0.5">
        <p className="line-clamp-1 text-[0.88rem] font-bold leading-tight text-white">
          {item.storyTitle}
        </p>
        <p className="line-clamp-1 text-[0.72rem] leading-snug text-zinc-400">{chapterLine}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <TrackedReelsLink
          className="tap-highlight inline-flex min-h-9 flex-1 items-center justify-center rounded-full bg-white px-3 py-2 text-[0.76rem] font-black text-zinc-950 transition hover:bg-zinc-100"
          context={context}
          href={item.readMoreHref}
          onClick={onCtaExperimentClick}
        >
          {ctaLabel}
        </TrackedReelsLink>
        <Link
          className="tap-highlight inline-flex min-h-9 flex-1 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] px-3 py-2 text-[0.74rem] font-semibold text-zinc-100 transition hover:bg-white/[0.08]"
          href={item.storyHref}
        >
          Vào truyện
        </Link>
      </div>
    </div>
  );
}
