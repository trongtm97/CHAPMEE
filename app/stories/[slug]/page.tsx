import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { StoryOpenTracker } from "@/components/analytics/StoryOpenTracker";
import { SponsoredStoryBadge } from "@/components/campaigns/SponsoredStoryBadge";
import { Comments } from "@/components/comments/Comments";
import { DesktopStoryDetail } from "@/components/story/DesktopStoryDetail";
import { StoryDetailPage } from "@/components/story/StoryDetailPage";
import { SupportButton } from "@/components/monetization/SupportButton";
import { ErrorState } from "@/components/ui";
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
import { getStoryChapters, EMPTY_STORY_CHAPTERS } from "@/lib/stories/get-story-chapters";
import { isStandaloneStory } from "@/lib/stories/story-structure";
import { getStoryReadingProgress } from "@/lib/stories/get-story-reading-progress";
import { getStoryBySlug } from "@/lib/stories/getStoryBySlug";
import {
  getMyStoryReview,
  getStoryReviewStats,
  getStoryReviews
} from "@/lib/reviews/story-reviews";
import { getComments } from "@/lib/comments/getComments";
import { getStoryRecommendationContext } from "@/lib/recommendations/story-context";
import { getStoryUserState } from "@/lib/stories/getStoryUserState";
import { loadStorySponsorCampaign } from "@/lib/campaigns/load-public-campaigns";
import { getStoryTopFans } from "@/lib/data/fan-scores";
import { getFanClubMembership, listActiveFanClubPlansByCreator } from "@/lib/data/fan-club";
import { tryRedirectFromLookupTable } from "@/lib/urls/canonical";
import { getStoryUrl } from "@/lib/seo/canonical";
import { parsePublicSegment } from "@/lib/urls/parse";
import { resolveStoryFromSegment } from "@/lib/urls/resolve-story";
import { getAudioPolicySettings } from "@/lib/settings/audio-policy-settings";
import { computeStoryAudioAdsAllowed, getPublicStoryAudioData } from "@/src/lib/audio/public-audio";
import {
  computeStoryFilmAdsAllowed,
  getPublishedStoryFilmAdaptationsPublic
} from "@/src/lib/film-adaptations/public-films";

type StoryPageProps = {
  params: Promise<{ slug: string }>;
};

function StoryCommentsSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[var(--surface-soft)] p-4">
      <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
      <div className="h-20 animate-pulse rounded-xl bg-white/10" />
      <div className="h-16 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug: segment } = await params;
  const resolved = await resolveStoryFromSegment(segment);
  const storySlug = resolved.story?.slug ?? segment;
  const { story } = await getStoryBySlug(storySlug);

  if (!story) {
    return {
      title: "Không tìm thấy truyện",
      description: "Truyện này không khả dụng hoặc chưa được xuất bản.",
      robots: { index: false, follow: false }
    };
  }

  return await buildPublicStoryMetadata(story);
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug: segment } = await params;
  const legacyPath = `/stories/${segment}`;
  await tryRedirectFromLookupTable(legacyPath);

  const storyParsed = parsePublicSegment(segment, "story");
  const resolved = await resolveStoryFromSegment(segment);

  // Chỉ redirect khi URL là slug cũ (/stories/x hoặc /truyen/x) — không redirect khi đã ở canonical.
  if (resolved.story && resolved.canonicalPath && !storyParsed) {
    permanentRedirect(resolved.canonicalPath);
  }

  const storySlug = resolved.story?.slug ?? segment;
  const { error, notFound: isNotFound, story } = await getStoryBySlug(storySlug);

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

  const returnTo = getStoryUrl({ slug: story.slug, public_code: story.publicCode });
  const [{ user }, topFans, supporterRanking, fanClubEnabled, fanClubPlans, storySponsorCampaign, reviewStats, myReview, initialReviewsPage, recommendationContext, audioData, publishedFilms] =
    await Promise.all([
      getCurrentUser(),
      getStoryTopFans(story.id, userState.userId, 5),
      getSupporterRankingForStory(story.id, 5),
      isFanClubEnabled(),
      listActiveFanClubPlansByCreator(story.creatorUserId ?? "", story.id),
      loadStorySponsorCampaign({ id: story.id, slug: story.slug }),
      getStoryReviewStats(story.id),
      userState.userId ? getMyStoryReview(story.id, userState.userId) : Promise.resolve(null),
      getStoryReviews(story.id, {
        page: 1,
        sort: "newest",
        viewerProfileId: userState.userId
      }),
      getStoryRecommendationContext({ storyId: story.id, userId: userState.userId }),
      getPublicStoryAudioData(story.id),
      getPublishedStoryFilmAdaptationsPublic(story.id)
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
  if (
    !isStandaloneStory(story) &&
    story.episodeCount > SHORT_STORY_CHAPTER_THRESHOLD &&
    readingProgress
  ) {
    const range = rangeForChapterNumber(readingProgress.episodeNumber, story.episodeCount);
    chaptersRangeStart = range.start;
    chaptersRangeEnd = range.end;
  }

  const [canShowStoryAudioAds, audioPolicy] = await Promise.all([
    computeStoryAudioAdsAllowed(
      {
        id: story.id,
        content_origin: story.contentOrigin,
        rights_status: story.rightsStatus
      },
      audioData.items
    ),
    getAudioPolicySettings()
  ]);
  const continueAudioItemId = audioPolicy.show_continue_listening
    ? audioData.continueAudioItemId
    : null;

  const canShowStoryFilmAds =
    publishedFilms.length > 0
      ? await computeStoryFilmAdsAllowed(
          {
            id: story.id,
            content_origin: story.contentOrigin,
            rights_status: story.rightsStatus
          },
          publishedFilms
        )
      : false;

  const chaptersData = isStandaloneStory(story)
    ? EMPTY_STORY_CHAPTERS
    : await getStoryChapters({
        storyId: story.id,
        rangeEnd: chaptersRangeEnd,
        rangeStart: chaptersRangeStart
      });

  const storyComments = await getComments({
    aggregateStoryComments: true,
    storyId: story.id
  });

  return (
    <div className="space-y-6">
      <StoryOpenTracker
        authorUserId={story.creatorUserId}
        isStandalone={isStandaloneStory(story)}
        slug={story.slug}
        storyId={story.id}
      />
      {storySponsorCampaign ? <SponsoredStoryBadge campaign={storySponsorCampaign} /> : null}
      <DesktopStoryDetail
        mainContent={
          <StoryDetailPage
            recommendationContext={recommendationContext}
            chaptersData={chaptersData}
            comments={storyComments.comments}
            fanClubEnabled={fanClubEnabled}
            fanClubMembership={fanMembership.data}
            fanClubPlans={fanClubPlans.data}
            initialReviewsPage={initialReviewsPage}
            myReview={myReview}
            readingProgress={readingProgress}
            reviewStats={reviewStats}
            showOriginalsBadge={showOriginalsBadge}
            story={story}
            supporters={supporterRanking.data}
            topFans={topFans}
            userState={userState}
            publishedAudioItems={audioData.items}
            audioQueue={audioData.queue}
            continueAudioItemId={continueAudioItemId}
            completedAudioItemIds={audioData.completedAudioItemIds}
            canShowStoryAudioAds={canShowStoryAudioAds}
            canShowStoryFilmAds={canShowStoryFilmAds}
            publishedFilms={publishedFilms}
          />
        }
        rightPanel={
          <>
            {story.contentOrigin === "translation" && !story.canReceiveTips ? null : (
              <SupportButton storyId={story.id} toCreatorUserId={story.creatorUserId} />
            )}
            <div className="hidden lg:block">
              <Suspense fallback={<StoryCommentsSkeleton />}>
                <Comments
                  aggregateStoryComments
                  returnTo={returnTo}
                  storySlug={story.slug}
                  target={{ storyId: story.id }}
                  title="Bình luận truyện"
                />
              </Suspense>
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
              { name: "Reels", url: buildCanonicalUrl("/") ?? "/" },
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
