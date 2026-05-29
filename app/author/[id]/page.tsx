import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreatorDashboardHeader } from "@/components/creator/CreatorDashboardHeader";
import { ShareButton } from "@/components/share/ShareButton";
import { SupportButton } from "@/components/monetization/SupportButton";
import { SupporterRanking } from "@/components/supporters/SupporterRanking";
import { EmptyState } from "@/components/ui";
import { getCreatorProfileByUserId } from "@/lib/creator/getCreatorProfile";
import { buildAuthorDescription, buildCanonicalUrl, getDefaultOgImage } from "@/lib/seo/metadata";
import { buildAuthorProfileSharePayload } from "@/lib/share/profileShare";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { createClient } from "@/lib/supabase/server";
import { getAuthorTopFans } from "@/lib/supabase/fan-scores";
import { getSupporterRankingForAuthor } from "@/lib/monetization/supporter-ranking";
import { FanClubCard } from "@/components/fanclub/FanClubCard";
import { isFanClubEnabled } from "@/lib/monetization/fan-club";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getFanClubMembership, listActiveFanClubPlansByCreator } from "@/lib/supabase/fan-club";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";

export const dynamic = "force-dynamic";

type AuthorPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { id } = await params;
  const { creatorProfile } = await getCreatorProfileByUserId(id);

  if (!creatorProfile) {
    return {
      title: "Không tìm thấy tác giả",
      description: "Không tìm thấy hồ sơ tác giả.",
      robots: { index: false, follow: false }
    };
  }

  const description = buildAuthorDescription({ penName: creatorProfile.pen_name, bio: creatorProfile.bio });
  const canonical = buildCanonicalUrl(`/author/${id}`);
  const ogImage = getDefaultOgImage();

  return {
    title: `${creatorProfile.pen_name} trên ChapMee`,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${creatorProfile.pen_name} trên ChapMee`,
      description,
      type: "profile",
      ...(canonical ? { url: canonical } : {}),
      images: [{ url: ogImage, alt: creatorProfile.pen_name }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${creatorProfile.pen_name} trên ChapMee`,
      description,
      images: [ogImage]
    }
  };
}

export default async function AuthorProfilePage({ params }: AuthorPageProps) {
  const { id } = await params;
  const { creatorProfile } = await getCreatorProfileByUserId(id);

  if (!creatorProfile) notFound();

  const supabase = await createClient();
  const [{ count: followersCount }, { count: storiesCount }, { data: metrics }] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("creator_id", creatorProfile.id),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("creator_id", creatorProfile.id),
    supabase.rpc("get_public_creator_profile_metrics", { input_creator_id: creatorProfile.id })
  ]);
  const metricsRow = Array.isArray(metrics) ? metrics[0] : metrics;
  const topFans = await getAuthorTopFans(creatorProfile.id, null, 3);
  const supporters = await getSupporterRankingForAuthor(creatorProfile.user_id, 5);
  const [{ user }, fanClubEnabled, fanClubPlans] = await Promise.all([
    getCurrentUser(),
    isFanClubEnabled(),
    listActiveFanClubPlansByCreator(creatorProfile.user_id)
  ]);
  const fanMembership = user
    ? await getFanClubMembership(user.id, creatorProfile.user_id, null)
    : { data: null, error: null };
  if (fanClubEnabled && fanClubPlans.data.length > 0) {
    await trackServerEvent({
      eventName: "fan_club_viewed",
      targetType: "creator",
      targetId: creatorProfile.user_id,
      category: "monetization",
      metadata: { creator_user_id: creatorProfile.user_id }
    });
  }
  const featuredStory = null;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="page-kicker">Author profile</p>
        <h1 className="page-title">Hồ sơ tác giả</h1>
      </section>

      <CreatorDashboardHeader creatorProfile={creatorProfile} />

      <div className="flex flex-wrap gap-3">
        <ShareButton
          className="min-h-11"
          label="Chia sẻ tác giả"
          payload={buildAuthorProfileSharePayload({
            creatorProfile,
            featuredStory,
            stats: {
              followers: Number(metricsRow?.follower_count ?? followersCount ?? 0),
              reads: Number(metricsRow?.total_read_count ?? 0),
              totalStories: Number(metricsRow?.story_count ?? storiesCount ?? 0)
            },
            url: getShareUrl(`/author/${id}`) ?? `/author/${id}`
          })}
        />
      </div>
      <SupportButton toCreatorUserId={creatorProfile.user_id} />
      <FanClubCard
        enabled={fanClubEnabled}
        membership={fanMembership.data}
        plans={fanClubPlans.data}
      />
      <SupporterRanking
        items={supporters.data}
        subtitle="Xếp hạng theo tổng coin ủng hộ."
        title="Top Người Ủng Hộ"
      />

      {topFans.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Top Fan của tác giả</h2>
          <div className="space-y-2">
            {topFans.slice(0, 3).map((fan) => (
              <div key={fan.id} className="chap-card flex items-center justify-between p-4">
                <div>
                  <p className="font-bold text-white">{fan.displayName}</p>
                  <p className="text-sm text-zinc-400">{fan.handle ?? "@reader"}</p>
                </div>
                <span className="text-sm font-black text-cyan-200">#{fan.rank}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState title="Chưa có dữ liệu Top Fan" description="Khi có fan score, top fan sẽ hiện ở đây." />
      )}
    </div>
  );
}
