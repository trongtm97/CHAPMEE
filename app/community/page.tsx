import type { Metadata } from "next";
import { CommunityLayout } from "@/components/community/MobileCommunityLayout";
import { SponsoredChallengeBanner } from "@/components/campaigns/SponsoredChallengeBanner";
import { isSponsoredContentEnabled } from "@/lib/campaigns/feature";
import { getAuthorGroups } from "@/lib/community/get-author-groups";
import { getCommunitySession } from "@/lib/community/get-community-feed";
import { getStoryGroups } from "@/lib/community/get-story-groups";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getActiveCampaignByType } from "@/lib/supabase/campaigns";

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
  const [session, storyGroupsData, authorGroupsData, sponsoredEnabled] = await Promise.all([
    getCommunitySession(),
    getStoryGroups(),
    getAuthorGroups(),
    isSponsoredContentEnabled()
  ]);
  const sponsoredBanner = sponsoredEnabled
    ? await getActiveCampaignByType("banner")
    : null;

  return (
    <section className="page-stack overflow-x-hidden">
      <CommunityLayout
        authorGroups={authorGroupsData.groups}
        isLoggedIn={session.isLoggedIn}
        storyGroups={storyGroupsData.groups}
      />

      {sponsoredBanner ? (
        <div className="mx-auto mt-6 w-full max-w-2xl xl:max-w-3xl">
          <SponsoredChallengeBanner
            campaignId={sponsoredBanner.id}
            ctaText={sponsoredBanner.ctaText}
            ctaUrl={sponsoredBanner.ctaUrl}
            disclosureText={sponsoredBanner.disclosureText}
            sponsorId={sponsoredBanner.sponsor?.id ?? null}
            sponsorLogoUrl={sponsoredBanner.sponsor?.logoUrl}
            sponsorName={sponsoredBanner.sponsor?.name ?? "Nhà tài trợ"}
          />
        </div>
      ) : null}
    </section>
  );
}
