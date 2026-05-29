import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeList } from "@/components/badges";
import { TopFansSection } from "@/components/fans";
import { CreatorProfileHeader } from "@/components/creators/CreatorProfileHeader";
import { CreatorStoriesGrid } from "@/components/creators/CreatorStoriesGrid";
import { AuthorProfileSeo } from "@/components/author/AuthorProfileSeo";
import { MilestoneSection } from "@/components/milestones/MilestoneSection";
import { BadgeCard } from "@/components/profile/BadgeCard";
import { ShareButton } from "@/components/share/ShareButton";
import { ErrorState, SectionHeader } from "@/components/ui";
import { SupportButton } from "@/components/monetization/SupportButton";
import { SupporterRanking } from "@/components/supporters/SupporterRanking";
import { getPublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import {
  buildCanonicalUrl,
  buildAuthorDescription,
  getDefaultOgImage
} from "@/lib/seo/metadata";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { getSupporterRankingForAuthor } from "@/lib/monetization/supporter-ranking";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { listStoryOriginalStatusesForCreator } from "@/lib/supabase/originals";
import { OriginalsBadge } from "@/components/story/OriginalsBadge";
import { buildPersonJsonLd } from "@/lib/seo/structured-data";

type CreatorProfilePageProps = {
  params: Promise<{
    creatorId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: CreatorProfilePageProps): Promise<Metadata> {
  const { creatorId } = await params;
  const result = await getPublicCreatorProfile(creatorId);

  if (!result.creator) {
    return {
      title: "Hồ sơ tác giả",
      description: "Hồ sơ tác giả trên ChapMee.",
      robots: { index: false, follow: false }
    };
  }

  const description = buildAuthorDescription({
    penName: result.creator.penName,
    bio: result.creator.bio
  });
  const canonical = buildCanonicalUrl(
    result.creator.handle
      ? `/tac-gia/${result.creator.handle}`
      : `/creators/${result.creator.id}`
  );
  const title = `Tác giả ${result.creator.penName} trên ChapMee`;
  const imageUrl = getDefaultOgImage();

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(canonical ? { url: canonical } : {}),
      images: [
        {
          url: imageUrl,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export default async function CreatorProfilePage({
  params
}: CreatorProfilePageProps) {
  const { creatorId } = await params;
  const result = await getPublicCreatorProfile(creatorId);

  if (result.notFound) {
    notFound();
  }

  if (result.error || !result.creator) {
    return (
      <section className="mx-auto max-w-[36rem] space-y-6">
        <div className="px-1">
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
            Tác giả
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal">
            Hồ sơ tác giả
          </h1>
        </div>
        <ErrorState
          message={result.error}
          title="Không tải được hồ sơ tác giả"
        />
      </section>
    );
  }

  const returnTo = `/creators/${result.creator.id}`;
  const [supporters, monetizationConfig] = await Promise.all([
    getSupporterRankingForAuthor(result.creator.userId, 5),
    getMonetizationConfig()
  ]);
  const originalsEnabled =
    Boolean(monetizationConfig.settings["monetization.enabled"]) &&
    Boolean(monetizationConfig.settings["originals_enabled"]);
  const originalsStatuses = originalsEnabled
    ? await listStoryOriginalStatusesForCreator(result.creator.userId, 200)
    : { data: [], error: null };
  const originalStoryIds = new Set(
    originalsStatuses.data
      .filter((row) => row.status === "original")
      .map((row) => row.story_id)
  );

  return (
    <AuthorProfileSeo
      header={<CreatorProfileHeader creator={result.creator} returnTo={returnTo} />}
      body={
        <section className="space-y-6">
      {originalsEnabled && originalStoryIds.size > 0 ? (
        <div className="px-1">
          <OriginalsBadge show />
          <p className="mt-2 text-sm text-zinc-300">
            Tác giả có {originalStoryIds.size} tác phẩm trong ChapMee Originals.
          </p>
        </div>
      ) : null}
      <div className="flex justify-end px-1">
        <ShareButton
          payload={{
            creatorId: result.creator.id,
            kind: "generic",
            title: result.creator.penName,
            text: buildAuthorDescription({
              penName: result.creator.penName,
              bio: result.creator.bio
            }),
            targetId: result.creator.id,
            targetType: "creator",
            url: getShareUrl(`/creators/${result.creator.id}`)
          }}
        />
      </div>
      <SupportButton toCreatorUserId={result.creator.userId} />
      <SupporterRanking
        items={supporters.data}
        subtitle="Top supporter theo coin của tác giả."
        title="Top Người Ủng Hộ"
      />
      <TopFansSection
        challengeTip="Người đọc càng đọc, comment và follow, Top Fan càng sáng rõ."
        currentUserTip="Bạn đang là Top Fan #{rank} của tác giả này."
        emptyDescription="Tác giả này chưa có fan score đủ nổi bật. Hãy tương tác nhiều hơn để mở khóa danh hiệu đầu tiên."
        emptyTitle="Chưa có Top Fan"
        items={result.creator.topFans}
        subtitle="Những người ủng hộ tác giả mạnh nhất"
        title="Top Fan của tác giả"
      />
      <BadgeList
        emptyDescription="Khi tác giả mở truyện đầu tiên hoặc chạm các mốc đọc, badge sẽ tự xuất hiện ở đây."
        emptyTitle="Chưa có badge tác giả"
        items={result.creator.badgeItems}
        maxVisible={4}
        seeAllLabel="Xem thêm"
        subtitle="Những badge này giúp tác giả khoe tiến độ và cột mốc public."
        title="Thành tích tác giả"
      />
      <MilestoneSection
        emptyDescription="Khi tác giả đạt các mốc lớn như xuất bản truyện đầu tiên hay chạm follower, chúng sẽ hiện ở đây."
        emptyTitle="Chưa có cột mốc tác giả"
        id="milestones"
        items={result.creator.milestones}
        maxVisible={6}
        subtitle="Các cột mốc public đáng tự hào của tác giả."
        title="Thành tích tác giả"
      />
      <section className="space-y-3">
        <SectionHeader
          subtitle="Thành tích hiển thị theo dữ liệu thật, không dựng số giả cho đẹp mắt."
          title="Thành tích tác giả"
        />
        <div className="grid gap-3">
          {result.creator.achievements.map((achievement) => (
            <BadgeCard badge={achievement} key={achievement.id} />
          ))}
        </div>
      </section>
      <CreatorStoriesGrid
        featuredEpisodes={result.creator.featuredEpisodes}
        stories={result.creator.stories}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPersonJsonLd({
              name: result.creator.penName,
              url:
                buildCanonicalUrl(
                  result.creator.handle
                    ? `/tac-gia/${result.creator.handle}`
                    : `/creators/${result.creator.id}`
                ) ?? `/creators/${result.creator.id}`,
              description: result.creator.bio,
              image: result.creator.avatarUrl
            })
          )
        }}
      />
    </section>
      }
    />
  );
}
