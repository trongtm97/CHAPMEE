import { BadgeList } from "@/components/badges";
import { TopFansSection } from "@/components/fans";
import { CreatorProfileHeader } from "@/components/creators/CreatorProfileHeader";
import { CreatorStoriesGrid } from "@/components/creators/CreatorStoriesGrid";
import { AuthorProfileSeo } from "@/components/author/AuthorProfileSeo";
import { MilestoneSection } from "@/components/milestones/MilestoneSection";
import { BadgeCard } from "@/components/profile/BadgeCard";
import { ShareButton } from "@/components/share/ShareButton";
import { SectionHeader } from "@/components/ui";
import { SupportButton } from "@/components/monetization/SupportButton";
import { SupporterRanking } from "@/components/supporters/SupporterRanking";
import { getCreatorPublicPath } from "@/lib/profile/creator-public-path";
import type { PublicCreatorProfile } from "@/lib/creators/getPublicCreatorProfile";
import { buildAuthorDescription, buildCanonicalUrl } from "@/lib/seo/metadata";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { getSupporterRankingForAuthor } from "@/lib/monetization/supporter-ranking";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { listStoryOriginalStatusesForCreator } from "@/lib/supabase/originals";
import { OriginalsBadge } from "@/components/story/OriginalsBadge";
import { buildPersonJsonLd } from "@/lib/seo/structured-data";

type CreatorPublicProfileViewProps = {
  creator: PublicCreatorProfile;
};

export async function CreatorPublicProfileView({ creator }: CreatorPublicProfileViewProps) {
  const returnTo = getCreatorPublicPath({
    username: creator.handle,
    creatorProfileId: creator.id
  });
  const [supporters, monetizationConfig] = await Promise.all([
    getSupporterRankingForAuthor(creator.userId, 5),
    getMonetizationConfig()
  ]);
  const originalsEnabled =
    Boolean(monetizationConfig.settings["monetization.enabled"]) &&
    Boolean(monetizationConfig.settings["originals_enabled"]);
  const originalsStatuses = originalsEnabled
    ? await listStoryOriginalStatusesForCreator(creator.userId, 200)
    : { data: [], error: null };
  const originalStoryIds = new Set(
    originalsStatuses.data
      .filter((row) => row.status === "original")
      .map((row) => row.story_id)
  );

  return (
    <AuthorProfileSeo
      header={<CreatorProfileHeader creator={creator} returnTo={returnTo} />}
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
                creatorId: creator.id,
                kind: "generic",
                title: creator.displayName,
                text: buildAuthorDescription({
                  displayName: creator.displayName,
                  bio: creator.bio
                }),
                targetId: creator.id,
                targetType: "creator",
                url: getShareUrl(returnTo)
              }}
            />
          </div>
          <SupportButton toCreatorUserId={creator.userId} />
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
            items={creator.topFans}
            subtitle="Những người ủng hộ tác giả mạnh nhất"
            title="Top Fan của tác giả"
          />
          <BadgeList
            emptyDescription="Khi tác giả mở truyện đầu tiên hoặc chạm các mốc đọc, badge sẽ tự xuất hiện ở đây."
            emptyTitle="Chưa có badge tác giả"
            items={creator.badgeItems}
            maxVisible={4}
            seeAllLabel="Xem thêm"
            subtitle="Những badge này giúp tác giả khoe tiến độ và cột mốc public."
            title="Thành tích tác giả"
          />
          <MilestoneSection
            emptyDescription="Khi tác giả đạt các mốc lớn như xuất bản truyện đầu tiên hay chạm follower, chúng sẽ hiện ở đây."
            emptyTitle="Chưa có cột mốc tác giả"
            id="milestones"
            items={creator.milestones}
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
              {creator.achievements.map((achievement) => (
                <BadgeCard badge={achievement} key={achievement.id} />
              ))}
            </div>
          </section>
          <CreatorStoriesGrid
            featuredEpisodes={creator.featuredEpisodes}
            stories={creator.stories}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                buildPersonJsonLd({
                  name: creator.displayName,
                  url: buildCanonicalUrl(returnTo) ?? returnTo,
                  description: creator.bio,
                  image: creator.avatarUrl
                })
              )
            }}
          />
        </section>
      }
    />
  );
}
