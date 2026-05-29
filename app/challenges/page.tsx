import type { Metadata } from "next";
import { ChallengeCard } from "@/components/challenges";
import { EmptyState } from "@/components/ui";
import { isSponsoredContentEnabled } from "@/lib/campaigns/feature";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getChallenges } from "@/lib/supabase/challenges";
import { getChallengeCampaignMap } from "@/lib/supabase/campaigns";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thử thách tác giả",
  description: "Khám phá các thử thách viết truyện dành cho tác giả trên ChapMee.",
  alternates: {
    canonical: buildCanonicalUrl("/challenges")
  }
};

function isCampaignPubliclyActive(campaign: {
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}) {
  if (campaign.status !== "active") return false;
  const now = Date.now();
  const startsAt = campaign.startsAt ? new Date(campaign.startsAt).getTime() : null;
  const endsAt = campaign.endsAt ? new Date(campaign.endsAt).getTime() : null;
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

export default async function ChallengesPage() {
  const [challenges, sponsoredEnabled] = await Promise.all([
    getChallenges(),
    isSponsoredContentEnabled()
  ]);
  const campaignMap = sponsoredEnabled
    ? await getChallengeCampaignMap(challenges.map((challenge) => challenge.id))
    : new Map();
  const publicChallenges = challenges.map((challenge) => {
    const campaign = campaignMap.get(challenge.id);
    return {
      ...challenge,
      sponsoredCampaignId:
        campaign && isCampaignPubliclyActive(campaign) ? campaign.id : null
    };
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="page-kicker">Tác giả</p>
        <h1 className="page-title">Thử thách tác giả</h1>
        <p className="page-copy">Thử thách định kỳ để tác giả có lý do đăng truyện và người đọc có lý do vote.</p>
      </section>

      {publicChallenges.length === 0 ? (
        <EmptyState title="Chưa có challenge" description="Hãy seed một challenge active để bắt đầu sự kiện cộng đồng." />
      ) : (
        <div className="space-y-3">
          {publicChallenges.map((challenge) => (
            <ChallengeCard
              challenge={challenge}
              key={challenge.id}
              sponsoredInfo={
                campaignMap.get(challenge.id) &&
                challenge.sponsoredCampaignId
                  ? {
                      sponsorName: campaignMap.get(challenge.id)?.sponsor?.name ?? "Nhà tài trợ",
                      sponsorLogoUrl: campaignMap.get(challenge.id)?.sponsor?.logoUrl ?? null,
                      disclosureText: campaignMap.get(challenge.id)?.disclosureText ?? "Được tài trợ"
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
