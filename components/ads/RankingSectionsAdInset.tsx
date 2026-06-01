"use client";

import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";

export function RankingSectionsAdInset() {
  return (
    <ChapMeeAdSlot
      className={AD_SLOT_IN_FEED_CLASS}
      placementKey="ranking_between_sections_mobile"
    />
  );
}
