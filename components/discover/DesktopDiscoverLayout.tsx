import { SponsoredChallengeBanner } from "@/components/campaigns/SponsoredChallengeBanner";
import { DiscoverFeed } from "@/components/discover/DiscoverFeed";
import { sponsoredBannerProps } from "@/lib/campaigns/load-public-campaigns";
import type { DiscoverData } from "@/lib/discover/getDiscoverData";
import type { CampaignWithSponsor } from "@/types/campaign";

type DesktopDiscoverLayoutProps = {
  data: DiscoverData;
  query: string;
  activeGenre: string;
  sponsoredBanner: CampaignWithSponsor | null;
};

export function DesktopDiscoverLayout({ data, query, sponsoredBanner }: DesktopDiscoverLayoutProps) {
  return (
    <div className="hidden pb-4 md:block">
      <DiscoverFeed
        data={data}
        header={
          <header className="mb-1 space-y-1">
            <p className="page-kicker">Khám phá</p>
            <h1 className="text-2xl font-black text-zinc-50 md:text-3xl">Khám phá truyện</h1>
          </header>
        }
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
