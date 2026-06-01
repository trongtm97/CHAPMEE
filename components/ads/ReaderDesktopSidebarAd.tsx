"use client";

import { AD_SLOT_SURFACE_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";

export function ReaderDesktopSidebarAd(props: {
  storyId: string;
  chapterId: string;
  authorId?: string;
}) {
  return (
    <ChapMeeAdSlot
      placementKey="desktop_reader_sidebar"
      storyId={props.storyId}
      chapterId={props.chapterId}
      authorId={props.authorId}
      className={`${AD_SLOT_SURFACE_CLASS} mb-4 hidden lg:block`}
    />
  );
}
