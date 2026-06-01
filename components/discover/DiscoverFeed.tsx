import { CreatorSpotlightSection } from "@/components/discover/CreatorSpotlightSection";
import { DiscoverArticlesBlock } from "@/components/discover/DiscoverArticlesBlock";
import { DiscoverTaxonomySections } from "@/components/discovery/DiscoverTaxonomySections";
import { DiscoverQuickAccessGrid } from "@/components/discover/DiscoverQuickAccessGrid";
import { AppSearchBar } from "@/components/ui/AppSearchBar";
import { MiniRanking } from "@/components/discover/MiniRanking";
import { MoodChipCarousel } from "@/components/discover/MoodChipCarousel";
import { StoryCarouselSection } from "@/components/discover/StoryCarouselSection";
import { ErrorState } from "@/components/ui";
import type { DiscoverData } from "@/lib/discover/getDiscoverData";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { DiscoverFeedAdInset } from "@/components/ads/DiscoverFeedAdInset";

/** Insert one in-feed ad after this many visible sections (0-indexed: after section 2 = 3rd block). */
const DISCOVER_AD_AFTER_SECTION_INDEX = 2;

type DiscoverFeedProps = {
  data: DiscoverData;
  query: string;
  header?: ReactNode;
  sponsoredBanner?: ReactNode;
};

export function DiscoverFeed({ data, header, query, sponsoredBanner }: DiscoverFeedProps) {
  const trackingSurface = query.trim() ? "search" : "discover";
  const showSearchResults = data.searchResults.length > 0 && query.trim().length > 0;

  let visibleSectionIndex = -1;

  return (
    <AdSlotBudgetProvider>
      {header}

      <AppSearchBar catalogNavigation defaultValue={query} />

      <div className="mt-7 space-y-7 md:mt-8 md:space-y-8">
        <DiscoverQuickAccessGrid />

        {!showSearchResults ? (
          <Suspense fallback={null}>
            <DiscoverArticlesBlock />
          </Suspense>
        ) : null}

        <MoodChipCarousel activeGenre="" genres={data.genres} variant="discover" />

        {!showSearchResults && data.taxonomy ? (
          <DiscoverTaxonomySections taxonomy={data.taxonomy} />
        ) : null}

        {sponsoredBanner}

        {data.error ? (
          <ErrorState message={data.error} title="Không tải được trang khám phá" />
        ) : null}

        {showSearchResults ? (
          <StoryCarouselSection
            href={`/search?q=${encodeURIComponent(query.trim())}`}
            seeAllLabel="Xem tất cả"
            stories={data.searchResults.slice(0, 12)}
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

          return (
            <div key={section.key}>
              <StoryCarouselSection
                href={section.href}
                stories={section.stories}
                subtitle={section.subtitle}
                title={section.title}
                trackingSurface={trackingSurface}
              />
              {showAd ? <DiscoverFeedAdInset /> : null}
            </div>
          );
        })}
      </div>
    </AdSlotBudgetProvider>
  );
}
