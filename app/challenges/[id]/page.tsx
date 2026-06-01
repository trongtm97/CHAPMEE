import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeEntryCard, ChallengePanel, SubmitChallengeEntry } from "@/components/challenges";
import { SponsoredChallengeBanner } from "@/components/campaigns/SponsoredChallengeBanner";
import { SponsoredChallengeTracker } from "@/components/campaigns/SponsoredChallengeTracker";
import { EmptyState } from "@/components/ui";
import { isSponsoredContentEnabled } from "@/lib/campaigns/feature";
import { sponsoredBannerProps } from "@/lib/campaigns/load-public-campaigns";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { getChallengeById, createChallengeEntry } from "@/lib/supabase/challenges";
import { getChallengeCampaignMap } from "@/lib/supabase/campaigns";

type ChallengePageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ChallengePageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getChallengeById(id);
  if (!result.challenge) {
    return { title: "Challenge not found", description: "Challenge không tồn tại." };
  }
  return {
    title: result.challenge.title,
    description: result.challenge.description ?? result.challenge.promptText,
    alternates: { canonical: buildCanonicalUrl(`/challenges/${id}`) }
  };
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;
  const [result, sponsoredEnabled] = await Promise.all([
    getChallengeById(id),
    isSponsoredContentEnabled()
  ]);

  if (!result.challenge) notFound();
  const campaignMap = sponsoredEnabled ? await getChallengeCampaignMap([result.challenge.id]) : new Map();
  const campaign = campaignMap.get(result.challenge.id);
  const isPubliclyActiveCampaign = campaign?.status === "active";
  const sponsoredCampaign = isPubliclyActiveCampaign ? campaign : null;

  return (
    <div className="space-y-8">
      {sponsoredCampaign ? (
        <SponsoredChallengeTracker
          campaignId={sponsoredCampaign.id}
          sponsorId={sponsoredCampaign.sponsor?.id ?? null}
          challengeId={result.challenge.id}
        />
      ) : null}
      <section className="space-y-3">
        <p className="page-kicker">Thử thách tác giả</p>
        <h1 className="page-title">{result.challenge.title}</h1>
        {result.challenge.description ? <p className="page-copy">{result.challenge.description}</p> : null}
      </section>

      {sponsoredCampaign ? (
        <SponsoredChallengeBanner
          {...sponsoredBannerProps(sponsoredCampaign, result.challenge.id)}
        />
      ) : null}

      <ChallengePanel active={result.challenge.status === "active"} />

      {result.challenge.status === "active" ? (
        <SubmitChallengeEntry
          challengeId={result.challenge.id}
          disabled={false}
          sponsoredTracking={
            sponsoredCampaign
              ? {
                  campaignId: sponsoredCampaign.id,
                  sponsorId: sponsoredCampaign.sponsor?.id ?? null
                }
              : null
          }
          onSubmitAction={async (formData) => {
            "use server";
            const title = String(formData.get("title") ?? "").trim();
            const description = String(formData.get("description") ?? "").trim();
            const storyId = String(formData.get("storyId") ?? "").trim() || null;
            const chapterId = String(formData.get("chapterId") ?? "").trim() || null;
            await createChallengeEntry({
              challengeId: result.challenge!.id,
              chapterId,
              description,
              storyId,
              title
            });
          }}
        />
      ) : (
        <EmptyState title="Challenge đã đóng" description="Không thể submit entry mới." />
      )}

      {result.entries.length === 0 ? (
        <EmptyState title="Chưa có entry" description="Hãy là người đầu tiên tham gia challenge này." />
      ) : (
        <div className="space-y-3">
          {result.entries.map((entry) => (
            <ChallengeEntryCard entry={entry} key={entry.id} />
          ))}
        </div>
      )}
    </div>
  );
}
