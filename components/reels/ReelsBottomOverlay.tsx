import Link from "next/link";
import { TrackedReelsLink } from "@/components/reels/TrackedReelsLink";
import { useExperiment } from "@/hooks/useExperiment";
import { trackExperimentConversion } from "@/lib/experiments/tracking";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type ReelsBottomOverlayProps = {
  context: ReelsAnalyticsContext;
};

export function ReelsBottomOverlay({ context }: ReelsBottomOverlayProps) {
  const item = context.item;
  const ctaExperiment = useExperiment("reels_cta_copy");
  const ctaLabel =
    item.ctaLabel ||
    (typeof ctaExperiment.payload.cta_label === "string"
      ? ctaExperiment.payload.cta_label
      : "Đọc tiếp");

  return (
    <aside className="pointer-events-none absolute inset-x-0 bottom-[calc(4.65rem+env(safe-area-inset-bottom))] z-20 px-4 sm:px-5">
      <div
        className="pointer-events-auto pr-[5.5rem] animate-[reelsOverlayIn_320ms_cubic-bezier(0.22,1,0.36,1)] sm:pr-[5.8rem]"
        key={item.id}
      >
        <div className="w-full max-w-[25rem] rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,10,16,0.74),rgba(6,10,16,0.92))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.34)] backdrop-blur-md">
          <div className="space-y-1">
            <p className="line-clamp-1 text-[1rem] font-bold text-white">
              {item.storyTitle}
            </p>
            <p className="line-clamp-1 text-[0.8rem] text-zinc-300/82">
              {item.episodeNumber > 0
                ? `Chương ${item.episodeNumber}${item.episodeTitle ? ` · ${item.episodeTitle}` : ""}`
                : item.episodeTitle || "Truyện"}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TrackedReelsLink
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[0.8rem] font-semibold text-zinc-100 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]"
              context={context}
              href={item.readMoreHref}
              onClick={() =>
                trackExperimentConversion({
                  experimentKey: "reels_cta_copy",
                  variant: ctaExperiment.variant,
                  conversionName: "reels_read_more_clicked",
                  properties: {
                    episode_id: item.id,
                    story_id: item.storyId
                  }
                })
              }
            >
              {ctaLabel}
            </TrackedReelsLink>
            <Link
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 py-2.5 text-[0.84rem] font-black text-zinc-950 transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-100"
              href={item.storyHref}
            >
              Vào truyện
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
