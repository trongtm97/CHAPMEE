import { Suspense } from "react";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { RankingSectionsAdInset } from "@/components/ads/RankingSectionsAdInset";
import { RankingTabs } from "@/components/rankings/RankingTabs";
import { RankingsSupportersSection } from "@/components/rankings/RankingsSupportersSection";
import { RankingSkeleton } from "@/components/rankings/RankingSkeleton";
import { fetchPublicGenres } from "@/lib/ranking/eligible-content";
import { createPublicClient } from "@/lib/data/public-client";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { getRecommendationTicketBalance } from "@/lib/recommendations/wallet";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { findRankingTabBySlug, type RankingUiTabId } from "@/types/ranking-board";

function SupportersFallback() {
  return (
    <section className="space-y-3">
      <div className="h-6 w-56 animate-pulse rounded bg-white/10" />
      <RankingSkeleton count={4} />
    </section>
  );
}

export async function RankingsPageByType({
  typeSlug,
  initialGenreSlug = null,
  initialTabId,
  boostedPage = false
}: {
  typeSlug: string;
  initialGenreSlug?: string | null;
  initialTabId?: RankingUiTabId;
  boostedPage?: boolean;
}) {
  const tab = findRankingTabBySlug(typeSlug);
  const isBoostedRoute = boostedPage || typeSlug === "duoc-de-cu";
  const db = createPublicClient();
  const genres = await fetchPublicGenres(db).catch(() => []);
  const ticketConfig = getRecommendationTicketsConfig();
  const { user } = await getCurrentUser();
  const ticketBalance = user
    ? await getRecommendationTicketBalance(user.id).catch(() => 0)
    : 0;

  return (
    <AdSlotBudgetProvider>
      <div className="mx-auto max-w-5xl space-y-6">
        <Suspense fallback={<RankingSkeleton count={5} />}>
          <RankingTabs
            boostFeatureEnabled={ticketConfig.enabled}
            showTicketBalance={Boolean(user)}
            ticketBalance={ticketBalance}
            boostedPage={isBoostedRoute}
            genres={genres.map((genre) => ({ slug: genre.slug, name: genre.name }))}
            initialGenreSlug={initialGenreSlug}
            initialTabId={initialTabId ?? tab.id}
          />
        </Suspense>
        <RankingSectionsAdInset />
        <Suspense fallback={<SupportersFallback />}>
          <RankingsSupportersSection />
        </Suspense>
      </div>
    </AdSlotBudgetProvider>
  );
}
