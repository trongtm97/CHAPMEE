import type { Metadata } from "next";
import { CommunityLayout } from "@/components/community/MobileCommunityLayout";
import { SponsoredChallengeBanner } from "@/components/campaigns/SponsoredChallengeBanner";
import { loadPublicCampaignContext, sponsoredBannerProps } from "@/lib/campaigns/load-public-campaigns";
import { getAuthorGroups } from "@/lib/community/get-author-groups";
import { getCommunitySession } from "@/lib/community/get-community-feed";
import { getStoriesForCommunityPost } from "@/lib/community/getStoriesForCommunityPost";
import { getStoryGroups } from "@/lib/community/get-story-groups";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

const communityDescription =
  "Theo dõi nhóm truyện, tác giả và bảng tin thảo luận từ cộng đồng ChapMee.";
const communityCanonical = buildCanonicalUrl("/community");

export const metadata: Metadata = {
  title: "Cộng đồng",
  description: communityDescription,
  alternates: communityCanonical ? { canonical: communityCanonical } : undefined,
  openGraph: {
    title: "Cộng đồng",
    description: communityDescription,
    type: "website",
    ...(communityCanonical ? { url: communityCanonical } : {})
  },
  twitter: {
    card: "summary",
    title: "Cộng đồng",
    description: communityDescription
  }
};

export default async function CommunityPage() {
  const [session, storyGroupsData, authorGroupsData, campaignContext, storyOptions] =
    await Promise.all([
      getCommunitySession(),
      getStoryGroups(),
      getAuthorGroups(),
      loadPublicCampaignContext(),
      getStoriesForCommunityPost()
    ]);
  const sponsoredBanner = campaignContext.communityBanner;

  return (
    <section className="page-stack overflow-x-hidden">
      <CommunityLayout
        authorGroups={authorGroupsData.groups}
        avatarUrl={session.avatarUrl}
        displayName={session.displayName}
        isLoggedIn={session.isLoggedIn}
        stories={storyOptions.stories}
        storyGroups={storyGroupsData.groups}
      />

      {sponsoredBanner ? (
        <div className="mx-auto mt-6 w-full max-w-2xl xl:max-w-3xl">
          <SponsoredChallengeBanner {...sponsoredBannerProps(sponsoredBanner)} />
        </div>
      ) : null}
    </section>
  );
}
