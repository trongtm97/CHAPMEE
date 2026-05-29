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
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import { StoryTabs, type StoryTabId } from "@/components/story/StoryTabs";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { formatSwipeCount } from "@/lib/swipe/formatCount";
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
  const returnTo = `/stories/${story.slug}`;
  const storyOwner = isStoryOwner(userState.userId, story.creatorUserId);
  const firstAvailableEpisode =
    readingProgress?.episodeNumber ??
    story.episodes[0]?.episodeNumber ??
    chaptersData.chapters[0]?.episodeNumber;
  const readHref = firstAvailableEpisode
    ? getStoryChapterHref(story.slug, firstAvailableEpisode)
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
      { label: "Lượt thích", value: formatSwipeCount(story.likeCount) },
      { label: "Đã lưu", value: formatSwipeCount(story.saveCount) }
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

  const tabs: { id: StoryTabId; label: string }[] = [
    { id: "chapters", label: "Chương" },
    { id: "about", label: "Giới thiệu" },
    { id: "comments", label: "Bình luận" },
    ...(hasFanTab ? [{ id: "fan" as const, label: "Fan" }] : [])
  ];

  const panels: Record<StoryTabId, ReactNode> = {
    chapters: (
      <StoryChaptersTab
        initialData={chaptersData}
        readingProgress={readingProgress}
        shortEpisodes={story.episodes}
        storyId={story.id}
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
      <StoryDetailHeader storySlug={story.slug} storyTitle={story.title} />
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
    </div>
  );
}
