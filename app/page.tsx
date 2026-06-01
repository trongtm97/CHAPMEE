import { Suspense } from "react";
import type { Metadata } from "next";
import { LazyReelsFeed } from "@/components/reels/LazyReelsFeed";
import { ReelsShell } from "@/components/reels/ReelsShell";
import { ErrorState, LoadingState } from "@/components/ui";
import { loadPublicCampaignContext } from "@/lib/campaigns/load-public-campaigns";
import { getProductConfigFast } from "@/lib/config/product-config";
import { getReelsItems } from "@/lib/reels/getReelsItems";
import { buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Reels";
  const description =
    "Lướt nhanh các trích đoạn truyện hấp dẫn, khám phá chương mới và tìm truyện đáng đọc.";
  const canonical = buildCanonicalUrl("/");

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

async function ReelsContent() {
  const [productConfig, reelsResult, campaignContext] = await Promise.all([
    getProductConfigFast(),
    getReelsItems({ limit: 12, offset: 0 }),
    loadPublicCampaignContext()
  ]);
  const { error, hasMore, items, nextOffset, nextCursor } = reelsResult;

  return (
    <ReelsShell>
      {error ? <ErrorState message={error} title="Không tải được Reels" /> : null}
      <LazyReelsFeed
        desktopConfig={productConfig.reels}
        initialHasMore={hasMore}
        initialItems={items}
        initialNextOffset={nextOffset}
        initialNextCursor={nextCursor ?? null}
        nativeCampaign={campaignContext.reelsNativeCard}
        nativeCardFrequency={campaignContext.settings.reelsNativeFrequency}
      />
    </ReelsShell>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<LoadingState label="Đang tải Reels..." />}>
      <ReelsContent />
    </Suspense>
  );
}
