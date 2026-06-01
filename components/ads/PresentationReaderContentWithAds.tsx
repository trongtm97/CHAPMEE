"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { PresentationReaderContent } from "@/components/reader/PresentationReaderContent";
import { fetchPlacementConfig } from "@/lib/ads/fetch-placement-config";
import { resolveMidContentSplit } from "@/lib/ads/split-content-for-mid-ad";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import type { PresentationMode } from "@/types/presentation";

type PresentationReaderContentWithAdsProps = {
  mode: PresentationMode;
  storyMode?: string | null;
  chapterMode?: string | null;
  content: string;
  structuredContent: unknown | null;
  contentFormat?: string | null;
  chapterImageMap?: ChapterImageMap;
  contentUnitCount: number;
  midPlacementKey?: string;
  storyId?: string;
  chapterId?: string;
  authorUserId?: string;
};

export function PresentationReaderContentWithAds({
  contentUnitCount,
  midPlacementKey = "reader_mid_content_mobile",
  storyId,
  chapterId,
  authorUserId,
  ...contentProps
}: PresentationReaderContentWithAdsProps) {
  const pathname = usePathname() ?? "/";
  const [midEnabled, setMidEnabled] = useState(false);
  const [minGap, setMinGap] = useState(8);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const placement = await fetchPlacementConfig(midPlacementKey, pathname);
      if (cancelled) {
        return;
      }
      if (!placement?.is_enabled) {
        setMidEnabled(false);
        return;
      }
      const gap = placement.min_content_gap ?? 8;
      setMinGap(gap);
      setMidEnabled(contentUnitCount >= gap);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, midPlacementKey, contentUnitCount]);

  const split = midEnabled
    ? resolveMidContentSplit({
        content: contentProps.content,
        structuredContent: contentProps.structuredContent,
        contentFormat: contentProps.contentFormat,
        minGap
      })
    : null;

  const adSlot = (
    <ChapMeeAdSlot
      authorId={authorUserId}
      chapterId={chapterId}
      className={AD_SLOT_IN_FEED_CLASS}
      placementKey={midPlacementKey}
      storyId={storyId}
    />
  );

  if (!split) {
    return (
      <>
        <PresentationReaderContent {...contentProps} />
        {midEnabled ? adSlot : null}
      </>
    );
  }

  if (split.kind === "composer") {
    return (
      <div className="space-y-0">
        <PresentationReaderContent
          {...contentProps}
          structuredContent={split.firstDoc}
          content=""
        />
        {adSlot}
        <PresentationReaderContent
          {...contentProps}
          structuredContent={split.secondDoc}
          content=""
        />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <PresentationReaderContent {...contentProps} content={split.firstContent} structuredContent={null} />
      {adSlot}
      <PresentationReaderContent
        {...contentProps}
        content={split.secondContent}
        structuredContent={null}
      />
    </div>
  );
}
