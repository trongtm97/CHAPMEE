import { CreatorSpotlightSection } from "@/components/discover/CreatorSpotlightSection";
import { DiscoverQuickAccessGrid } from "@/components/discover/DiscoverQuickAccessGrid";
import { AppSearchBar } from "@/components/ui/AppSearchBar";
import { MiniRanking } from "@/components/discover/MiniRanking";
import { MoodChipCarousel } from "@/components/discover/MoodChipCarousel";
import { StoryCarouselSection } from "@/components/discover/StoryCarouselSection";
import { SwipeTeaserCard } from "@/components/discover/SwipeTeaserCard";
import { UpdatedStoriesCompactList } from "@/components/discover/UpdatedStoriesCompactList";
import { ErrorState } from "@/components/ui";
import type { DiscoverData, DiscoverStory } from "@/lib/discover/getDiscoverData";
import type { ReactNode } from "react";

type DiscoverFeedProps = {
  data: DiscoverData;
  query: string;
  header?: ReactNode;
  sponsoredBanner?: ReactNode;
};

function dedupeStories(stories: DiscoverStory[], usedIds: Set<string>, limit: number) {
  const unique: DiscoverStory[] = [];
  for (const story of stories) {
    if (usedIds.has(story.id)) {
      continue;
    }
    usedIds.add(story.id);
    unique.push(story);
    if (unique.length >= limit) {
      break;
    }
  }
  return unique;
}

export function DiscoverFeed({ data, header, query, sponsoredBanner }: DiscoverFeedProps) {
  const usedIds = new Set<string>();
  const recommended = dedupeStories(
    data.searchResults.length > 0 ? data.searchResults : data.hot24h,
    usedIds,
    8
  );
  const updated = dedupeStories(data.updatedStories, usedIds, 3);
  const hotStories = dedupeStories(data.hot24h, usedIds, 6);
  const quickReads = dedupeStories(data.shortReads, usedIds, 6);
  const rankingStories = data.hot24h.filter(
    (story, index, array) => array.findIndex((item) => item.id === story.id) === index
  );

  return (
    <>
      {header}

      <AppSearchBar catalogNavigation defaultValue={query} />

      <div className="mt-7 space-y-7 md:mt-8 md:space-y-8">
        <DiscoverQuickAccessGrid />

        <MoodChipCarousel variant="catalog" />

        <SwipeTeaserCard />

        {sponsoredBanner}

        {data.error ? <ErrorState message={data.error} title="Không tải được trang khám phá" /> : null}

        <MiniRanking stories={rankingStories} />

        <StoryCarouselSection href="/truyen" stories={recommended} title="Đề xuất cho bạn" />

        <UpdatedStoriesCompactList stories={updated.length > 0 ? updated : data.updatedStories} />

        <StoryCarouselSection href="/truyen?sort=hot&page=1" stories={hotStories} title="Đang hot" />

        <StoryCarouselSection
          href="/truyen?sort=quick&page=1"
          stories={quickReads}
          title="Đọc nhanh 1 phút"
        />

        <CreatorSpotlightSection creators={data.risingCreators} />
      </div>
    </>
  );
}
