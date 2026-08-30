import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TaxonomyFilterApplyTracker } from "@/components/analytics/TaxonomyFilterApplyTracker";
import { DesktopDiscoverLayout } from "@/components/discover/DesktopDiscoverLayout";
import { MobileDiscoverLayout } from "@/components/discover/MobileDiscoverLayout";
import { SeoContentBlockSlot } from "@/components/seo/SeoContentBlockSlot";
import { LoadingState } from "@/components/ui";
import { loadPublicCampaignContext } from "@/lib/campaigns/load-public-campaigns";
import { getOptionalSessionUser } from "@/lib/auth/get-optional-session-user";
import { getDiscoverDataCached } from "@/lib/discover/getDiscoverDataCached";
import { cleanText } from "@/lib/seo/metadata";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";

type DiscoverPageProps = {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    tab?: string;
    page?: string;
  }>;
};

export const revalidate = 60;

export async function generateMetadata({
  searchParams
}: DiscoverPageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = cleanText(params.q);
  const genre = cleanText(params.genre);
  const title = genre
    ? `Khám phá thể loại ${genre}`
    : query
      ? `Kết quả tìm kiếm: ${query}`
      : "Khám phá truyện, audio, video và cộng đồng | ChapMee";
  const description = genre
    ? `Khám phá truyện theo thể loại ${genre} trên ChapMee.`
    : query
      ? `Xem kết quả tìm kiếm cho "${query}" trên ChapMee.`
      : "Tìm truyện sáng tác, truyện dịch, audio truyện, video chuyển thể, bài viết và nội dung nổi bật trên ChapMee.";
  const canonicalPath = query
    ? `/discover?q=${encodeURIComponent(query)}${genre ? `&genre=${encodeURIComponent(genre)}` : ""}`
    : genre
      ? `/discover?genre=${encodeURIComponent(genre)}`
      : "/discover";
  const hasSearchQuery = Boolean(query);

  return metadataForStaticRoute({
    path: canonicalPath,
    pageType: "discover",
    targetType: "discover",
    fallbackTitle: title,
    fallbackDescription: description,
    indexableOverride: hasSearchQuery ? false : null,
    followOverride: true
  });
}

async function DiscoverContent({ searchParams }: DiscoverPageProps) {
  const params = await searchParams;
  if (params.tab === "films") {
    const page = params.page ? `&page=${encodeURIComponent(String(params.page))}` : "";
    redirect(`/media?tab=video${page}`);
  }
  const query = params.q ?? "";
  const activeGenre = params.genre ?? "";
  const page = Number(params.page ?? "1");
  const showSeoBlock = !query.trim() && !activeGenre.trim() && (!Number.isFinite(page) || page <= 1);
  const user = await getOptionalSessionUser();
  const [data, campaignContext, audioPolicy] = await Promise.all([
    getDiscoverDataCached(query, activeGenre, "all", Number.isFinite(page) ? page : 1, user?.id ?? null),
    loadPublicCampaignContext(),
    getAudioPolicySettings()
  ]);
  const audioBadgeDisplay = {
    showAudioBadge: audioPolicy.show_audio_badge_on_story_cards,
    showContinuousBadge: audioPolicy.show_continuous_playback_badge
  };

  return (
    <>
      <TaxonomyFilterApplyTracker
        filters={{ genre: activeGenre || undefined, q: query || undefined }}
        sourcePage="discover"
      />
      <MobileDiscoverLayout
        activeGenre={activeGenre}
        audioBadgeDisplay={audioBadgeDisplay}
        data={data}
        query={query}
        sponsoredBanner={campaignContext.discoverBanner}
      />
      <DesktopDiscoverLayout
        activeGenre={activeGenre}
        audioBadgeDisplay={audioBadgeDisplay}
        data={data}
        query={query}
        sponsoredBanner={campaignContext.discoverBanner}
      />
      {showSeoBlock ? (
        <SeoContentBlockSlot locale="vi" pageType="discover" routePath="/discover" />
      ) : null}
    </>
  );
}

export default function DiscoverPage(props: DiscoverPageProps) {
  return (
    <Suspense fallback={<LoadingState label="Đang tải trang khám phá..." />}>
      <DiscoverContent {...props} />
    </Suspense>
  );
}
