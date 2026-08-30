import { SponsoredChallengeBanner } from "@/components/campaigns/SponsoredChallengeBanner";

import { DiscoverFeed } from "@/components/discover/DiscoverFeed";

import { sponsoredBannerProps } from "@/lib/campaigns/load-public-campaigns";

import type { DiscoverData } from "@/lib/discover/getDiscoverData";

import type { StoryAudioBadgeDisplay } from "@/src/components/story/StoryAudioBadge";

import type { CampaignWithSponsor } from "@/types/campaign";



type MobileDiscoverLayoutProps = {

  data: DiscoverData;

  query: string;

  activeGenre: string;

  sponsoredBanner?: CampaignWithSponsor | null;

  audioBadgeDisplay?: StoryAudioBadgeDisplay;

};



export function MobileDiscoverLayout({

  data,

  query,

  activeGenre,

  sponsoredBanner,

  audioBadgeDisplay

}: MobileDiscoverLayoutProps) {

  return (

    <div className="pb-2 md:hidden">

      <DiscoverFeed

        activeGenre={activeGenre}

        audioBadgeDisplay={audioBadgeDisplay}

        data={data}

        query={query}

        sponsoredBanner={

          sponsoredBanner ? (

            <SponsoredChallengeBanner {...sponsoredBannerProps(sponsoredBanner)} />

          ) : null

        }

      />

    </div>

  );

}

