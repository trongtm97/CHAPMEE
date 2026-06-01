"use client";

import type { ReactNode } from "react";
import { PollCard } from "@/components/polls/PollCard";
import { StoryAboutTab } from "@/components/story/StoryAboutTab";
import { StoryActions } from "@/components/story/StoryActions";
import { StoryCommentsTab } from "@/components/story/StoryCommentsTab";
import { StoryChaptersTab } from "@/components/story/StoryChaptersTab";
import { StoryToast } from "@/components/story/StoryToast";
import { StoryFanTab } from "@/components/story/StoryFanTab";
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
import type { ShareCardPayload } from "@/types/share";
import type { StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";
import { Suspense } from "react";
import { AD_SLOT_IN_FEED_CLASS } from "@/components/ads/ad-slot-styles";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";

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
};

export function StoryDetailPage({
  comments,
  fanClubEnabled,
  fanClubMembership,
  fanClubPlans,
  chaptersData,
  readingProgress,
  showOriginalsBadge,
  story,
  supporters,
  topFans,
  userState
}: StoryDetailPageProps) {
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
    url: getShareUrl(`/truyen/${story.slug}`)
  };

  const hasFanTab =
    topFans.length > 0 ||
    supporters.length > 0 ||
    userState.isEarlyFan ||
    story.earlyFanCount > 0 ||
    (fanClubEnabled && fanClubPlans.length > 0);

  const tabs: { id: StoryTabId; label: string }[] = standalone
    ? [
        { id: "chapters", label: "Đọc" },
        { id: "about", label: "Giới thiệu" },
        { id: "comments", label: "Bình luận" },
        ...(hasFanTab ? [{ id: "fan" as const, label: "Fan" }] : [])
      ]
    : [
        { id: "chapters", label: "Chương" },
        { id: "about", label: "Giới thiệu" },
        { id: "comments", label: "Bình luận" },
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
    comments: (
      <StoryCommentsTab
        comments={comments}
        currentUserId={userState.userId}
        returnTo={returnTo}
        storyId={story.id}
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
      <StoryHero showOriginalsBadge={showOriginalsBadge} story={story} />
      <StoryActions
        isStoryOwner={storyOwner}
        readHref={readHref}
        returnTo={returnTo}
        sharePayload={sharePayload}
        story={story}
        userState={userState}
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
