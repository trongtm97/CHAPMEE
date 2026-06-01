"use client";

import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";

/** Between discover sections — mobile only, respects page ad budget. */
export function DiscoverFeedAdInset() {
  return (
    <ChapMeeAdSlot className={AD_SLOT_IN_FEED_CLASS} placementKey="discover_in_feed_mobile" />
  );
}
