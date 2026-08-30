"use client";

import { useEffect, useState } from "react";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import {
  FILM_AD_PLACEMENT_KEYS,
  shouldBlockFilmCompanionAdRefresh
} from "@/src/lib/film-adaptations/film-ads-guard";

type FilmCompanionAdSlotProps = {
  placementKey?: string;
  canShowAds: boolean;
  storyId?: string;
  authorId?: string;
  /** When true, suppresses ad slot to avoid accidental clicks beside the YouTube iframe. */
  youtubePlayerOpen?: boolean;
  className?: string;
};

/**
 * Policy-guarded ad slot for film adaptation surfaces.
 * Uses admin placement config via ChapMeeAdSlot (no hard-coded creatives).
 */
export function FilmCompanionAdSlot({
  placementKey = FILM_AD_PLACEMENT_KEYS.storySection,
  canShowAds,
  storyId,
  authorId,
  youtubePlayerOpen = false,
  className = AD_SLOT_IN_FEED_CLASS
}: FilmCompanionAdSlotProps) {
  const [documentHidden, setDocumentHidden] = useState(false);

  useEffect(() => {
    const update = () => setDocumentHidden(document.visibilityState === "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  if (!canShowAds) {
    return null;
  }

  if (shouldBlockFilmCompanionAdRefresh({ documentHidden, youtubePlayerOpen })) {
    return null;
  }

  return (
    <div
      className={`mt-8 border-t border-white/10 pt-6 ${className}`}
      data-film-companion-ad="true"
    >
      <p className="mb-3 text-[11px] text-zinc-500">Quảng cáo</p>
      <ChapMeeAdSlot
        authorId={authorId}
        className={className}
        placementKey={placementKey}
        storyId={storyId}
      />
    </div>
  );
}
