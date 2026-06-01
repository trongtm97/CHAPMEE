import type { Metadata } from "next";
import { Suspense } from "react";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { RankingSectionsAdInset } from "@/components/ads/RankingSectionsAdInset";
import { RankingTabs } from "@/components/rankings/RankingTabs";
import { RankingsSupportersSection } from "@/components/rankings/RankingsSupportersSection";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { fetchPublicGenres } from "@/lib/ranking/eligible-content";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { createClient } from "@/lib/supabase/server";
import { findRankingTabBySlug } from "@/types/ranking-board";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Bảng xếp hạng ChapMee",
  description:
    "Khám phá bảng xếp hạng truyện, tác giả mới, Reels kéo đọc và top theo thể loại trên ChapMee.",
  alternates: {
    canonical: buildCanonicalUrl("/bang-xep-hang")
  },
  openGraph: {
    title: "Bảng xếp hạng ChapMee",
    description:
      "Khám phá bảng xếp hạng truyện, tác giả mới, Reels kéo đọc và top theo thể loại trên ChapMee.",
    type: "website",
    url: buildCanonicalUrl("/bang-xep-hang") ?? undefined
  },
  twitter: {
    card: "summary",
    title: "Bảng xếp hạng ChapMee",
    description:
      "Khám phá bảng xếp hạng truyện, tác giả mới, Reels kéo đọc và top theo thể loại trên ChapMee."
  }
};

function SupportersFallback() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
      <RankingSkeleton count={4} />
    </section>
  );
}

export default async function RankingsPage() {
  const supabase = await createClient();
  const genres = await fetchPublicGenres(supabase).catch(() => []);

  return (
    <AdSlotBudgetProvider>
      <div className="space-y-6">
        <RankingTabs
          genres={genres.map((genre) => ({ slug: genre.slug, name: genre.name }))}
          initialTabId="week"
        />
        <RankingSectionsAdInset />
        <Suspense fallback={<SupportersFallback />}>
          <RankingsSupportersSection />
        </Suspense>
      </div>
    </AdSlotBudgetProvider>
  );
}

export async function RankingsPageByType({
  typeSlug,
  initialGenreSlug = null
}: {
  typeSlug: string;
  initialGenreSlug?: string | null;
}) {
  const tab = findRankingTabBySlug(typeSlug);
  const supabase = await createClient();
  const genres = await fetchPublicGenres(supabase).catch(() => []);

  return (
    <AdSlotBudgetProvider>
      <div className="space-y-6">
        <RankingTabs
          genres={genres.map((genre) => ({ slug: genre.slug, name: genre.name }))}
          initialGenreSlug={initialGenreSlug}
          initialTabId={tab.id}
        />
        <RankingSectionsAdInset />
        <Suspense fallback={<SupportersFallback />}>
          <RankingsSupportersSection />
        </Suspense>
      </div>
    </AdSlotBudgetProvider>
  );
}
