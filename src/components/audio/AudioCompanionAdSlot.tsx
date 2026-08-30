"use client";

import { useEffect, useState } from "react";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";

type AudioCompanionAdSlotProps = {
  placementKey: string;
  canShowAds: boolean;
  storyId?: string;
  authorId?: string;
  className?: string;
};

/**
 * Policy-guarded ad slot for audio companion surfaces.
 * Does not render when ads policy blocks, page is hidden, or user is listening in background.
 */
export function AudioCompanionAdSlot({
  placementKey,
  canShowAds,
  storyId,
  authorId,
  className = AD_SLOT_IN_FEED_CLASS
}: AudioCompanionAdSlotProps) {
  const { state } = useGlobalAudioPlayer();
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

  const audioPlayingInBackground = state.isPlaying && documentHidden;
  if (audioPlayingInBackground) {
    return null;
  }

  return (
    <div className={`my-6 ${className}`} data-audio-companion-ad="true">
      <ChapMeeAdSlot
        authorId={authorId}
        className={className}
        placementKey={placementKey}
        storyId={storyId}
      />
    </div>
  );
}
