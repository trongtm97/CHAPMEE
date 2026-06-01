"use client";

import { Suspense, useState, type ReactNode } from "react";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { EpisodeListSheet } from "@/components/reader/EpisodeListSheet";
import { ReaderActionSheet } from "@/components/reader/ReaderActionSheet";
import { ReaderToast } from "@/components/reader/ReaderToast";
import { ReaderChapterMeta } from "@/components/reader/ReaderChapterMeta";
import { ReaderCommentsPreview } from "@/components/reader/ReaderCommentsPreview";
import { AD_SLOT_IN_FEED_CLASS, AD_SLOT_SURFACE_CLASS } from "@/components/ads/ad-slot-styles";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { PresentationReaderContentWithAds } from "@/components/ads/PresentationReaderContentWithAds";
import { ReaderEndNavigation } from "@/components/reader/ReaderEndNavigation";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import { ReaderReactionPanel } from "@/components/reader/ReaderReactionPanel";
import { ReaderSettingsSheet } from "@/components/reader/ReaderSettingsSheet";
import { ReadingProgressBar } from "@/components/reader/ReadingProgressBar";
import { ReadingProgressTracker } from "@/components/reader/ReadingProgressTracker";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getShareUrl } from "@/lib/share/getShareUrl";
import type { CommentView } from "@/lib/comments/getComments";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";
import { isStoryOwner } from "@/lib/studio/ownership";
import type { StoryEpisode } from "@/lib/stories/getStoryBySlug";
import type { ChapterReactionView } from "@/types/reaction";
import type { ShareCardPayload } from "@/types/share";

type ReaderPageProps = {
  data: EpisodeReaderData;
  analyticsContext: ReaderAnalyticsContext;
  userState: StoryUserState;
  episodes: StoryEpisode[];
  reaction: ChapterReactionView | null;
  comments: CommentView[];
  commentsUserId: string | null;
  episodeDescription: string;
  showReactions: boolean;
  showComments: boolean;
  lockedContent?: boolean;
  afterContent?: ReactNode;
  contentUnitCount?: number;
};

export function ReaderPage({
  afterContent,
  analyticsContext,
  comments,
  commentsUserId,
  data,
  episodeDescription,
  episodes,
  contentUnitCount = 0,
  lockedContent = false,
  reaction,
  showComments,
  showReactions,
  userState
}: ReaderPageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const returnTo = data.chapterHref;
  const storyOwner = isStoryOwner(userState.userId, data.story.creatorUserId);
  const sharePayload: ShareCardPayload = {
    authorName: data.story.creatorName,
    backgroundUrl: data.episode.backgroundImageUrl ?? data.story.coverUrl ?? null,
    ctaLabel: "Xem Reels truyện này trên ChapMee",
    excerpt: episodeDescription,
    creatorId: data.story.creatorId,
    genreName: data.story.genreName,
    hook: data.story.hook,
    kind: "reel",
    slug: `${data.story.slug}-${data.episode.episodeNumber}`,
    storyId: data.story.id,
    targetId: data.episode.id,
    targetType: "episode",
    text: episodeDescription,
    title: `${data.episode.title} - ${data.story.title}`,
    url: getShareUrl(returnTo)
  };

  return (
    <ReaderPreferencesProvider>
      <Suspense fallback={null}>
        <ReaderToast />
      </Suspense>
      <ReadingProgressBar />
      <ReaderAnalyticsTracker context={analyticsContext} />
      {!lockedContent ? (
        <ReadingProgressTracker
          episodeId={data.episode.id}
          returnTo={returnTo}
          storyId={data.story.id}
        />
      ) : null}
      <div className="reader-page mx-auto w-full max-w-[42rem] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:max-w-none lg:px-0 lg:pb-8">
        <AdSlotBudgetProvider>
        <ReaderHeader
          episodeNumber={data.episode.episodeNumber}
          episodeTitle={data.episode.title}
          onOpenEpisodeList={() => setEpisodeListOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          storyPublicCode={data.story.publicCode}
          storySlug={data.story.slug}
          storyTitle={data.story.title}
        />
        <ReaderChapterMeta data={data} />
        <ChapMeeAdSlot
          authorId={data.story.creatorUserId ?? undefined}
          chapterId={data.episode.id}
          className={AD_SLOT_IN_FEED_CLASS}
          placementKey="reader_top_mobile"
          storyId={data.story.id}
        />
        <PresentationReaderContentWithAds
          authorUserId={data.story.creatorUserId ?? undefined}
          chapterId={data.episode.id}
          chapterImageMap={data.chapterImageMap}
          chapterMode={data.episode.chapterPresentationMode}
          content={data.episode.content}
          contentFormat={data.episode.contentFormat}
          contentUnitCount={contentUnitCount}
          mode={data.episode.presentationMode}
          storyId={data.story.id}
          storyMode={data.episode.storyPresentationMode}
          structuredContent={data.episode.structuredContent}
        />
        {afterContent}
        {!lockedContent && showReactions ? (
          <ReaderReactionPanel
            chapterId={data.episode.id}
            loggedIn={userState.isLoggedIn}
            reaction={reaction}
            returnTo={returnTo}
            storyId={data.story.id}
          />
        ) : null}
        {!lockedContent ? (
          <ChapMeeAdSlot
            authorId={data.story.creatorUserId ?? undefined}
            chapterId={data.episode.id}
            className={AD_SLOT_IN_FEED_CLASS}
            placementKey="reader_bottom_mobile"
            storyId={data.story.id}
          />
        ) : null}
        {!lockedContent ? (
          <ReaderEndNavigation analyticsContext={analyticsContext} data={data} />
        ) : null}
        {!lockedContent ? (
          <ChapMeeAdSlot
            authorId={data.story.creatorUserId ?? undefined}
            chapterId={data.episode.id}
            className={`${AD_SLOT_SURFACE_CLASS} hidden lg:block`}
            placementKey="desktop_reader_bottom"
            storyId={data.story.id}
          />
        ) : null}
        {!lockedContent && showComments ? (
          <ReaderCommentsPreview
            comments={comments}
            currentUserId={commentsUserId}
            episodeId={data.episode.id}
            returnTo={returnTo}
            storyId={data.story.id}
          />
        ) : null}
        </AdSlotBudgetProvider>
      </div>
      <ReaderSettingsSheet onClose={() => setSettingsOpen(false)} open={settingsOpen} />
      <EpisodeListSheet
        currentEpisodeNumber={data.episode.episodeNumber}
        episodes={episodes}
        onClose={() => setEpisodeListOpen(false)}
        open={episodeListOpen}
        storyPublicCode={data.story.publicCode}
        storySlug={data.story.slug}
        storyTitle={data.story.title}
      />
      <ReaderActionSheet
        chapterId={data.episode.id}
        creatorId={data.story.creatorId}
        isFollowingCreator={userState.isFollowingCreator}
        isLoggedIn={userState.isLoggedIn}
        isSaved={userState.isSaved}
        isStoryOwner={storyOwner}
        onClose={() => setMenuOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        open={menuOpen}
        returnTo={returnTo}
        sharePayload={sharePayload}
        storyId={data.story.id}
        storyPublicCode={data.story.publicCode}
        storySlug={data.story.slug}
      />
    </ReaderPreferencesProvider>
  );
}
