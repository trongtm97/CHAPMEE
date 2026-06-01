"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AD_SLOT_SURFACE_CLASS } from "@/components/ads/ad-slot-styles";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { fetchPlacementConfig } from "@/lib/ads/fetch-placement-config";
import { splitArticleMarkdownForMidAd } from "@/lib/ads/split-article-markdown-for-mid-ad";
import { renderMarkdownContent } from "@/lib/platform-content/render-markdown-content";

type ContentPostArticleWithAdsProps = {
  content: string;
  minBlocks?: number;
};

export function ContentPostArticleWithAds({
  content,
  minBlocks = 6
}: ContentPostArticleWithAdsProps) {
  const pathname = usePathname() ?? "/";
  const [midEnabled, setMidEnabled] = useState(false);
  const [bottomEnabled, setBottomEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [mid, bottom] = await Promise.all([
        fetchPlacementConfig("content_hub_article_mid", pathname),
        fetchPlacementConfig("content_hub_article_bottom", pathname)
      ]);
      if (!cancelled) {
        setMidEnabled(Boolean(mid?.is_enabled));
        setBottomEnabled(Boolean(bottom?.is_enabled));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const split =
    midEnabled && content.trim()
      ? splitArticleMarkdownForMidAd(content, minBlocks)
      : null;

  return (
    <AdSlotBudgetProvider>
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        {split ? (
          <>
            {renderMarkdownContent(split.first)}
            <ChapMeeAdSlot className={AD_SLOT_SURFACE_CLASS} placementKey="content_hub_article_mid" />
            {renderMarkdownContent(split.second)}
          </>
        ) : (
          renderMarkdownContent(content)
        )}
      </div>
      {bottomEnabled ? (
        <ChapMeeAdSlot className={AD_SLOT_SURFACE_CLASS} placementKey="content_hub_article_bottom" />
      ) : null}
    </AdSlotBudgetProvider>
  );
}
