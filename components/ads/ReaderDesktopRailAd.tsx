"use client";

import { AD_SLOT_RAIL_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import {
  READER_DESKTOP_RAIL_PLACEMENTS,
  type ReaderDesktopRailSide
} from "@/lib/ads/reader-desktop-rail-placements";

export function ReaderDesktopRailAd(props: {
  side: ReaderDesktopRailSide;
  storyId: string;
  chapterId: string;
  authorId?: string;
}) {
  return (
    <ChapMeeAdSlot
      authorId={props.authorId}
      chapterId={props.chapterId}
      className={AD_SLOT_RAIL_CLASS}
      placementKey={READER_DESKTOP_RAIL_PLACEMENTS[props.side]}
      storyId={props.storyId}
    />
  );
}
