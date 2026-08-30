import { CreatorSpotlightSection } from "@/components/discover/CreatorSpotlightSection";
import { DiscoverTaxonomySections } from "@/components/discovery/DiscoverTaxonomySections";
import { BoostedStoriesSection } from "@/components/discover/BoostedStoriesSection";
import { DiscoverHero } from "@/components/discover/DiscoverHero";
import { DiscoverLatestUpdates } from "@/components/discover/DiscoverLatestUpdates";
import { DiscoverQuickAccessGrid } from "@/components/discover/DiscoverQuickAccessGrid";
import { DiscoverUtilitiesSection } from "@/components/discover/DiscoverUtilitiesSection";
import { MiniRanking } from "@/components/discover/MiniRanking";
import { StoryCarouselSection } from "@/components/discover/StoryCarouselSection";

import { ErrorState } from "@/components/ui";

import type { DiscoverData } from "@/lib/discover/getDiscoverData";

import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";

import type { ReactNode } from "react";

import { Suspense } from "react";

import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";

import { DiscoverFeedAdInset } from "@/components/ads/DiscoverFeedAdInset";



const DISCOVER_AD_AFTER_SECTION_INDEX = 2;



type DiscoverFeedProps = {

  data: DiscoverData;

  query: string;

  activeGenre?: string;

  sponsoredBanner?: ReactNode;

  audioBadgeDisplay?: StoryAudioBadgeDisplay;

};



function sectionBadge(

  key: string

): { badgeText?: string; badgeTone?: "cyan" | "amber" | "violet" | "ember" } {

  if (key === "featured_originals" || key === "top_originals") {

    return { badgeText: "Truyện sáng tác", badgeTone: "ember" };

  }

  if (key === "free_translations" || key === "top_translations") {

    return { badgeText: "Truyện dịch", badgeTone: "amber" };

  }

  if (key === "recommended_boosted") {

    return { badgeText: "Boost", badgeTone: "violet" };

  }

  return {};

}



export function DiscoverFeed({

  data,

  query,

  sponsoredBanner,

  activeGenre = "",

  audioBadgeDisplay

}: DiscoverFeedProps) {

  const trackingSurface = query.trim() ? "search" : "discover";

  const showSearchResults = data.searchResults.length > 0 && query.trim().length > 0;



  let visibleSectionIndex = -1;



  return (

    <AdSlotBudgetProvider>

      <div className="mx-auto max-w-5xl space-y-5 md:space-y-7">

        <DiscoverHero query={query} />



        {!showSearchResults ? <DiscoverQuickAccessGrid /> : null}

        {!showSearchResults ? <DiscoverUtilitiesSection /> : null}



        {!showSearchResults ? <DiscoverLatestUpdates items={data.latestUpdates} /> : null}



        {!showSearchResults ? (

          <Suspense fallback={null}>

            <BoostedStoriesSection />

          </Suspense>

        ) : null}



        {!showSearchResults && data.taxonomy ? (
          <DiscoverTaxonomySections
            activeGenre={activeGenre}
            query={query}
            taxonomy={data.taxonomy}
          />
        ) : null}



        {sponsoredBanner}



        {data.error ? (

          <ErrorState message={data.error} title="Không tải được trang khám phá" />

        ) : null}



        {showSearchResults ? (

          <StoryCarouselSection

            audioBadgeDisplay={audioBadgeDisplay}

            href={`/search?q=${encodeURIComponent(query.trim())}`}

            seeAllLabel="Xem tất cả"

            stories={data.searchResults}

            subtitle={`${data.searchResults.length} truyện — mở trang tìm kiếm để xem đầy đủ`}

            title="Kết quả"

            trackingSurface="search"

          />

        ) : null}



        {data.sections.map((section) => {

          if (section.variant === "ranking") {

            if (section.stories.length === 0) {

              return null;

            }

            visibleSectionIndex += 1;

            const showAd = visibleSectionIndex === DISCOVER_AD_AFTER_SECTION_INDEX;

            return (

              <div key={section.key}>

                <MiniRanking stories={section.stories} />

                {showAd ? <DiscoverFeedAdInset /> : null}

              </div>

            );

          }



          if (section.variant === "creators" && section.creators.length > 0) {

            visibleSectionIndex += 1;

            const showAd = visibleSectionIndex === DISCOVER_AD_AFTER_SECTION_INDEX;

            return (

              <div key={section.key}>

                <CreatorSpotlightSection

                  creators={section.creators}

                  href={section.href}

                  title={section.title}

                />

                {showAd ? <DiscoverFeedAdInset /> : null}

              </div>

            );

          }



          if (section.stories.length === 0) {

            return null;

          }



          visibleSectionIndex += 1;

          const showAd = visibleSectionIndex === DISCOVER_AD_AFTER_SECTION_INDEX;

          const badges = sectionBadge(section.key);



          return (

            <div key={section.key}>

              <StoryCarouselSection

                audioBadgeDisplay={audioBadgeDisplay}

                href={section.href}

                seeAllLabel="Xem tất cả"

                stories={section.stories}

                subtitle={section.subtitle}

                title={section.title}

                trackingSurface={trackingSurface}

                {...badges}

              />

              {showAd ? <DiscoverFeedAdInset /> : null}

            </div>

          );

        })}

      </div>

    </AdSlotBudgetProvider>

  );

}


