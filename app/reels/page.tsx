import { Suspense } from "react";

import type { Metadata } from "next";

import { LazyReelsFeed } from "@/components/reels/LazyReelsFeed";
import { ReelsShell } from "@/components/reels/ReelsShell";
import { ErrorState, LoadingState } from "@/components/ui";
import { loadPublicCampaignContext } from "@/lib/campaigns/load-public-campaigns";
import { getProductConfigFast } from "@/lib/config/product-config";
import { getReelsItemByPublicCode } from "@/lib/reels/get-reels-item-by-public-code";
import { getReelsItems } from "@/lib/reels/getReelsItems";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type ReelsPageProps = {
  searchParams: Promise<{ reel?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const title = "Reels";
  const description =
    "Lướt nhanh các trích đoạn truyện hấp dẫn, khám phá chương mới và tìm truyện đáng đọc.";
  const canonical = buildCanonicalUrl(REELS_PUBLIC_PATH);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      images: [{ url: getDefaultOgImage(), alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getDefaultOgImage()]
    }
  };
}

async function ReelsContent({ focusReelCode }: { focusReelCode: string | null }) {
  const [productConfig, reelsResult, campaignContext, focusedItem] = await Promise.all([
    getProductConfigFast(),
    getReelsItems({ limit: 12, offset: 0 }),
    loadPublicCampaignContext(),
    focusReelCode ? getReelsItemByPublicCode(focusReelCode) : Promise.resolve(null)
  ]);

  const { error, hasMore, items, nextOffset, nextCursor } = reelsResult;
  const initialItems =
    focusedItem && !items.some((item) => item.reelPublicCode === focusedItem.reelPublicCode)
      ? [focusedItem, ...items]
      : items;

  return (
    <ReelsShell>
      {error ? <ErrorState message={error} title="Không tải được Reels" /> : null}
      <LazyReelsFeed
        desktopConfig={productConfig.reels}
        initialFocusReelPublicCode={focusReelCode}
        initialHasMore={hasMore}
        initialItems={initialItems}
        initialNextOffset={nextOffset}
        initialNextCursor={nextCursor ?? null}
        nativeCampaign={campaignContext.reelsNativeCard}
        nativeCardFrequency={campaignContext.settings.reelsNativeFrequency}
      />
    </ReelsShell>
  );
}

export default async function ReelsPage({ searchParams }: ReelsPageProps) {
  const params = await searchParams;
  const focusReelCode = params.reel?.trim() || null;

  return (
    <Suspense fallback={<LoadingState label="Đang tải Reels..." />}>
      <ReelsContent focusReelCode={focusReelCode} />
    </Suspense>
  );
}
