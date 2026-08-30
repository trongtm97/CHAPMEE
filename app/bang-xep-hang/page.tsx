import type { Metadata } from "next";
import { Suspense } from "react";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { RankingSectionsAdInset } from "@/components/ads/RankingSectionsAdInset";
import { RankingTabs } from "@/components/rankings/RankingTabs";
import { RankingsSupportersSection } from "@/components/rankings/RankingsSupportersSection";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { SeoContentBlockSlot } from "@/components/seo/SeoContentBlockSlot";
import { createPublicClient } from "@/lib/data/public-client";
import { fetchPublicGenres } from "@/lib/ranking/eligible-content";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/bang-xep-hang",
    pageType: "ranking",
    targetType: "ranking",
    fallbackTitle: "Bảng xếp hạng truyện và tác giả | ChapMee",
    fallbackDescription:
      "Khám phá truyện, tác giả, reels, audio và nội dung được cộng đồng ChapMee yêu thích."
  });
}

function SupportersFallback() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
      <RankingSkeleton count={4} />
    </section>
  );
}

export default async function BangXepHangPage() {
  const db = createPublicClient();
  const genres = await fetchPublicGenres(db).catch(() => []);

  return (
    <AdSlotBudgetProvider>
      <div className="mx-auto max-w-5xl space-y-6">
        <RankingTabs
          genres={genres.map((genre) => ({ slug: genre.slug, name: genre.name }))}
          initialTabId="today"
        />
        <RankingSectionsAdInset />
        <Suspense fallback={<SupportersFallback />}>
          <RankingsSupportersSection />
        </Suspense>
        <SeoContentBlockSlot locale="vi" pageType="ranking" routePath="/bang-xep-hang" />
      </div>
    </AdSlotBudgetProvider>
  );
}
