import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryOpenTracker } from "@/components/analytics/StoryOpenTracker";
import { Comments } from "@/components/comments/Comments";
import { DesktopStoryDetail } from "@/components/story/DesktopStoryDetail";
import { StoryDetailPage } from "@/components/story/StoryDetailPage";
import { SupportButton } from "@/components/monetization/SupportButton";
import { ErrorState } from "@/components/ui";
import { getComments } from "@/lib/comments/getComments";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { isFanClubEnabled } from "@/lib/monetization/fan-club";
import { getMonetizationConfig } from "@/lib/monetization/config";
import { getSupporterRankingForStory } from "@/lib/monetization/supporter-ranking";
import { buildPublicStoryMetadata } from "@/lib/seo/build-metadata";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildStoryBookJsonLd } from "@/lib/seo/structured-data";
import {
  rangeForChapterNumber,
  SHORT_STORY_CHAPTER_THRESHOLD
} from "@/lib/stories/chapter-ranges";
import { getStoryChapters } from "@/lib/stories/get-story-chapters";
import { getStoryReadingProgress } from "@/lib/stories/get-story-reading-progress";
import { getStoryBySlug } from "@/lib/stories/getStoryBySlug";
import { getStoryUserState } from "@/lib/stories/getStoryUserState";
import { getStoryTopFans } from "@/lib/supabase/fan-scores";
import { getFanClubMembership, listActiveFanClubPlansByCreator } from "@/lib/supabase/fan-club";

type StoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { story } = await getStoryBySlug(slug);

  if (!story) {
    return {
      title: "Không tìm thấy truyện",
      description: "Truyện này không khả dụng hoặc chưa được xuất bản.",
      robots: { index: false, follow: false }
    };
  }

  return buildPublicStoryMetadata(story);
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const { error, notFound: isNotFound, story } = await getStoryBySlug(slug);

  if (isNotFound) {
    notFound();
  }

  if (!story) {
    return (
      <section className="space-y-5">
        <h1 className="text-3xl font-bold tracking-normal">Không tải được truyện</h1>
        <ErrorState message={error} title="Không tải được truyện" />
      </section>
    );
  }

  const userState = await getStoryUserState(story.id, story.creatorId);
  const monetizationConfig = await getMonetizationConfig();
  const showOriginalsBadge =
    Boolean(monetizationConfig.settings["monetization.enabled"]) &&
    Boolean(monetizationConfig.settings["originals_enabled"]);

  const returnTo = `/stories/${story.slug}`;
  const [{ user }, topFans, supporterRanking, commentsResult, fanClubEnabled, fanClubPlans] =
    await Promise.all([
      getCurrentUser(),
      getStoryTopFans(story.id, userState.userId, 5),
      getSupporterRankingForStory(story.id, 5),
      getComments({ storyId: story.id }),
      isFanClubEnabled(),
      listActiveFanClubPlansByCreator(story.creatorUserId ?? "", story.id)
    ]);

  const fanMembership =
    user && story.creatorUserId
      ? await getFanClubMembership(user.id, story.creatorUserId, story.id)
      : { data: null, error: null };

  if (fanClubEnabled && fanClubPlans.data.length > 0) {
    await trackServerEvent({
      eventName: "fan_club_viewed",
      targetType: "story",
      targetId: story.id,
      category: "monetization",
      metadata: { story_id: story.id, creator_user_id: story.creatorUserId }
    });
  }

  const readingProgress = user
    ? await getStoryReadingProgress(story.id, user.id)
    : null;

  let chaptersRangeStart: number | undefined;
  let chaptersRangeEnd: number | undefined;
  if (story.episodeCount > SHORT_STORY_CHAPTER_THRESHOLD && readingProgress) {
    const range = rangeForChapterNumber(readingProgress.episodeNumber, story.episodeCount);
    chaptersRangeStart = range.start;
    chaptersRangeEnd = range.end;
  }

  const chaptersData = await getStoryChapters({
    storyId: story.id,
    rangeEnd: chaptersRangeEnd,
    rangeStart: chaptersRangeStart
  });

  return (
    <div className="space-y-6">
      <StoryOpenTracker slug={story.slug} storyId={story.id} />
      <DesktopStoryDetail
        mainContent={
          <StoryDetailPage
            chaptersData={chaptersData}
            comments={commentsResult.comments}
            fanClubEnabled={fanClubEnabled}
            fanClubMembership={fanMembership.data}
            fanClubPlans={fanClubPlans.data}
            readingProgress={readingProgress}
            showOriginalsBadge={showOriginalsBadge}
            story={story}
            supporters={supporterRanking.data}
            topFans={topFans}
            userState={userState}
          />
        }
        rightPanel={
          <>
            <SupportButton storyId={story.id} toCreatorUserId={story.creatorUserId} />
            <div className="hidden lg:block">
              <Comments returnTo={returnTo} target={{ storyId: story.id }} title="Bình luận truyện" />
            </div>
          </>
        }
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildStoryBookJsonLd(story))
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: "Trang chủ", url: buildCanonicalUrl("/") ?? "/" },
              { name: "Truyện", url: buildCanonicalUrl("/truyen") ?? "/truyen" },
              {
                name: story.title,
                url: buildCanonicalUrl(`/truyen/${story.slug}`) ?? `/truyen/${story.slug}`
              }
            ])
          )
        }}
      />
    </div>
  );
}
