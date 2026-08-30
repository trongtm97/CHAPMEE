"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { PollCard } from "@/components/polls/PollCard";
import { StoryAboutTab } from "@/components/story/StoryAboutTab";
import { StoryActions } from "@/components/story/StoryActions";
import { StoryCommentsTab } from "@/components/story/StoryCommentsTab";
import { StoryChaptersTab } from "@/components/story/StoryChaptersTab";
import { StoryToast } from "@/components/story/StoryToast";
import { StoryFanTab } from "@/components/story/StoryFanTab";
import { StoryReviewsTab } from "@/components/story/reviews/StoryReviewsTab";
import { RecommendStoryCard } from "@/components/recommendations/RecommendStoryCard";
import { StoryDetailHeader } from "@/components/story/StoryDetailHeader";
import { StoryHero } from "@/components/story/StoryHero";
import { StandaloneStoryReader } from "@/components/story/StandaloneStoryReader";
import { getLegacyStoryEpisodePath } from "@/lib/urls/paths";
import { getStoryChapterHref, getStoryDetailHref } from "@/lib/stories/story-routes";
import {
  hasStandaloneContent,
  isStandaloneStory
} from "@/lib/stories/story-structure";
import { StoryTabs, type StoryTabId } from "@/components/story/StoryTabs";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { formatReelsCount } from "@/lib/reels/formatCount";
import { buildStoryDescription } from "@/lib/seo/metadata";
import type { CommentView } from "@/lib/comments/getComments";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";
import { isStoryOwner } from "@/lib/studio/ownership";
import type { FanClubMembership, FanClubPlan } from "@/types/fan-club";
import type { TopFanHighlight, TopFanPerson } from "@/types/fan";
import type { SupporterRankingItem } from "@/types/tip";
import type {
  StoryReviewStatsView,
  StoryReviewView,
  StoryReviewsPageResult
} from "@/types/story-review";
import type { ShareCardPayload } from "@/types/share";
import type { StoryRecommendationContext } from "@/lib/recommendations/story-context";
import type { StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";
import { Suspense } from "react";
import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { StoryAudioSection } from "@/src/components/audio/StoryAudioSection";
import type { AudioItemRow } from "@/src/lib/audio/audio-items";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";
import type { PublicFilmAdaptation } from "@/src/lib/film-adaptations/public-films";
import { StoryFilmAdaptationsSection } from "@/components/films/StoryFilmAdaptationsSection";
import { useGlobalAudioPlayer } from "@/src/components/audio/GlobalAudioProvider";
import { useStoryAudioClientProgress } from "@/src/hooks/useStoryAudioClientProgress";

type StoryDetailPageProps = {
  story: StoryDetail;
  userState: StoryUserState;
  showOriginalsBadge: boolean;
  comments: CommentView[];
  topFans: Array<TopFanPerson | TopFanHighlight>;
  supporters: SupporterRankingItem[];
  fanClubEnabled: boolean;
  fanClubPlans: FanClubPlan[];
  fanClubMembership: FanClubMembership | null;
  chaptersData: StoryChaptersResult;
  readingProgress: StoryReadingProgress | null;
  reviewStats: StoryReviewStatsView;
  myReview: StoryReviewView | null;
  initialReviewsPage: StoryReviewsPageResult;
  recommendationContext: StoryRecommendationContext;
  publishedAudioItems: AudioItemRow[];
  audioQueue: StoryAudioQueueItem[];
  continueAudioItemId: string | null;
  completedAudioItemIds?: string[];
  canShowStoryAudioAds: boolean;
  canShowStoryFilmAds: boolean;
  publishedFilms: PublicFilmAdaptation[];
};

export function StoryDetailPage({
  comments,
  fanClubEnabled,
  fanClubMembership,
  fanClubPlans,
  chaptersData,
  recommendationContext,
  initialReviewsPage,
  myReview,
  readingProgress,
  reviewStats,
  showOriginalsBadge,
  story,
  supporters,
  topFans,
  userState,
  publishedAudioItems,
  audioQueue,
  continueAudioItemId,
  completedAudioItemIds = [],
  canShowStoryAudioAds,
  canShowStoryFilmAds,
  publishedFilms
}: StoryDetailPageProps) {
  const { playQueue } = useGlobalAudioPlayer();
  const standalone = isStandaloneStory(story);
  const returnTo = getStoryDetailHref({ slug: story.slug, public_code: story.publicCode });
  const storyOwner = isStoryOwner(userState.userId, story.creatorUserId);
  const firstAvailableEpisodeNumber =
    readingProgress?.episodeNumber ??
    story.episodes[0]?.episodeNumber ??
    chaptersData.chapters[0]?.episodeNumber;
  const firstEpisode =
    story.episodes.find((episode) => episode.episodeNumber === firstAvailableEpisodeNumber) ??
    chaptersData.chapters.find((chapter) => chapter.episodeNumber === firstAvailableEpisodeNumber);
  const readHref = standalone
    ? hasStandaloneContent(story)
      ? `${returnTo}#story-content`
      : null
    : firstEpisode
      ? firstEpisode.publicCode && story.publicCode
        ? getStoryChapterHref(
            { slug: story.slug, public_code: story.publicCode },
            { slug: firstEpisode.slug, public_code: firstEpisode.publicCode }
          )
        : getLegacyStoryEpisodePath(story.slug, firstEpisode.episodeNumber)
      : null;

  const sharePayload: ShareCardPayload = {
    authorName: story.creatorName,
    ctaLabel: "Đọc tiếp trên ChapMee",
    coverUrl: story.coverUrl,
    creatorId: story.creatorId,
    genreName: story.genreName,
    hook: story.hook,
    kind: "story",
    slug: story.slug,
    storyId: story.id,
    stats: [
      { label: "Lượt thích", value: formatReelsCount(story.likeCount) },
      { label: "Đã lưu", value: formatReelsCount(story.saveCount) }
    ],
    title: story.title,
    targetId: story.id,
    targetType: "story",
    text: buildStoryDescription(story),
    url: getShareUrl(returnTo)
  };

  const hasFanTab =
    topFans.length > 0 ||
    supporters.length > 0 ||
    userState.isEarlyFan ||
    story.earlyFanCount > 0 ||
    (fanClubEnabled && fanClubPlans.length > 0);
  const hasStoryAudio = publishedAudioItems.length > 0;
  const publishedAudioItemIds = useMemo(
    () => publishedAudioItems.filter((item) => item.status === "published").map((item) => item.id),
    [publishedAudioItems]
  );
  const { continueAudioItemId: effectiveContinueAudioItemId } = useStoryAudioClientProgress({
    storyId: story.id,
    itemIds: publishedAudioItemIds,
    serverContinueAudioItemId: continueAudioItemId
  });
  const continueItem =
    audioQueue.find((item) => item.audioItemId === effectiveContinueAudioItemId) ?? null;

  const tabs: { id: StoryTabId; label: string }[] = standalone
    ? [
        { id: "chapters", label: "Đọc" },
        ...(publishedAudioItems.length > 0 ? [{ id: "audio" as const, label: "Audio" }] : []),
        ...(publishedFilms.length > 0 ? [{ id: "films" as const, label: "Phim chuyển thể" }] : []),
        { id: "about", label: "Giới thiệu" },
        { id: "comments", label: "Bình luận" },
        { id: "reviews", label: reviewStats.reviewCount > 0 ? `Đánh giá (${reviewStats.reviewCount})` : "Đánh giá" },
        ...(hasFanTab ? [{ id: "fan" as const, label: "Fan" }] : [])
      ]
    : [
        { id: "chapters", label: "Chương" },
        ...(publishedAudioItems.length > 0 ? [{ id: "audio" as const, label: "Audio" }] : []),
        ...(publishedFilms.length > 0 ? [{ id: "films" as const, label: "Phim chuyển thể" }] : []),
        { id: "about", label: "Giới thiệu" },
        { id: "comments", label: "Bình luận" },
        { id: "reviews", label: reviewStats.reviewCount > 0 ? `Đánh giá (${reviewStats.reviewCount})` : "Đánh giá" },
        ...(hasFanTab ? [{ id: "fan" as const, label: "Fan" }] : [])
      ];

  const panels: Record<StoryTabId, ReactNode> = {
    chapters: standalone ? (
      <div id="story-content">
        <StandaloneStoryReader story={story} />
      </div>
    ) : (
      <StoryChaptersTab
        initialData={chaptersData}
        isTranslation={story.contentOrigin === "translation"}
        readingProgress={readingProgress}
        shortEpisodes={story.episodes}
        storyId={story.id}
        storyPublicCode={story.publicCode}
        storySlug={story.slug}
      />
    ),
    about: (
      <StoryAboutTab
        showOriginalsNote={showOriginalsBadge && story.originalsStatus === "original"}
        story={story}
      />
    ),
    audio: (
      <StoryAudioSection
        authorId={story.creatorUserId}
        canShowAds={canShowStoryAudioAds}
        completedAudioItemIds={completedAudioItemIds}
        continueAudioItemId={continueAudioItemId}
        items={publishedAudioItems}
        queue={audioQueue}
        storyHref={returnTo}
        storyId={story.id}
      />
    ),
    films: (
      <StoryFilmAdaptationsSection
        authorId={story.creatorUserId}
        canShowAds={canShowStoryFilmAds}
        items={publishedFilms}
        storyId={story.id}
        storyTitle={story.title}
      />
    ),
    comments: (
      <StoryCommentsTab
        comments={comments}
        currentUserId={userState.userId}
        returnTo={returnTo}
        storyId={story.id}
        storySlug={story.slug}
      />
    ),
    reviews: (
      <StoryReviewsTab
        initialReviewsPage={initialReviewsPage}
        isAuthor={storyOwner}
        loggedIn={userState.isLoggedIn}
        myReview={myReview}
        returnTo={returnTo}
        stats={reviewStats}
        storyId={story.id}
        viewerProfileId={userState.userId}
      />
    ),
    fan: (
      <StoryFanTab
        earlyFanCount={story.earlyFanCount}
        fanClubEnabled={fanClubEnabled}
        fanClubMembership={fanClubMembership}
        fanClubPlans={fanClubPlans}
        isEarlyFan={userState.isEarlyFan}
        storyTitle={story.title}
        supporters={supporters}
        topFans={topFans}
      />
    )
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-2 lg:max-w-none">
      <Suspense fallback={null}>
        <StoryToast />
      </Suspense>
      <StoryDetailHeader
        storyPublicCode={story.publicCode}
        storySlug={story.slug}
        storyTitle={story.title}
      />
      <StoryHero
        hasPublishedAudio={hasStoryAudio}
        hasPublishedFilms={publishedFilms.length > 0}
        showOriginalsBadge={showOriginalsBadge}
        story={story}
      />
      {hasStoryAudio ? (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
          {audioQueue.length > 0 ? (
            <>
              <button
                aria-label="Nghe truyện"
                className="min-h-10 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                onClick={() => void playQueue(audioQueue, continueItem?.audioItemId)}
                type="button"
              >
                Nghe truyện
              </button>
              <button
                aria-label="Nghe truyện từ đầu"
                className="min-h-10 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                onClick={() => void playQueue(audioQueue, undefined, true)}
                type="button"
              >
                Nghe từ đầu
              </button>
              {continueItem ? (
                <button
                  aria-label="Nghe tiếp truyện"
                  className="min-h-10 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
                  onClick={() => void playQueue(audioQueue, continueItem.audioItemId)}
                  type="button"
                >
                  Nghe tiếp
                </button>
              ) : null}
            </>
          ) : (
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/5"
              href="#audio"
            >
              Xem danh sách audio
            </Link>
          )}
        </section>
      ) : null}
      <StoryActions
        isStoryOwner={storyOwner}
        readHref={readHref}
        returnTo={returnTo}
        sharePayload={sharePayload}
        story={story}
        userState={userState}
      />
      <RecommendStoryCard
        context={recommendationContext}
        loggedIn={userState.isLoggedIn}
        returnTo={returnTo}
        storyId={story.id}
      />
      {story.poll ? (
        <PollCard
          authorId={story.creatorId}
          loggedIn={userState.isLoggedIn}
          poll={story.poll}
          returnTo={returnTo}
          storyId={story.id}
        />
      ) : null}
      <StoryTabs defaultTab="chapters" panels={panels} tabs={tabs} />
      <AdSlotBudgetProvider>
        <ChapMeeAdSlot
          authorId={story.creatorUserId ?? undefined}
          className={AD_SLOT_IN_FEED_CLASS}
          placementKey="story_detail_bottom_mobile"
          storyId={story.id}
        />
      </AdSlotBudgetProvider>
    </div>
  );
}
