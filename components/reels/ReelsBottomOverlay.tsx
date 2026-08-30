"use client";

import { ReelCtaCard } from "@/components/reels/ReelCtaCard";
import { REELS_GUTTER_X_CLASS, reelsContentPadding } from "@/components/reels/reels-layout";
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
    <aside
      className={`pointer-events-none absolute inset-x-0 z-40 ${REELS_GUTTER_X_CLASS}`}
      style={{ bottom: reelsContentPadding.ctaBottom }}
    >
      <div
        className="pointer-events-auto w-full animate-[reelsOverlayIn_280ms_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        key={item.id}
      >
        <ReelCtaCard
          context={context}
          ctaLabel={ctaLabel}
          onCtaExperimentClick={() =>
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
        />
      </div>
    </aside>
  );
}
