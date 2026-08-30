"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { AD_SLOT_IN_FEED_CLASS, AD_SLOT_SURFACE_CLASS } from "@/components/ads/ad-slot-styles";
import { AdSlotBudgetProvider } from "@/components/ads/AdSlotBudgetContext";
import { ChapMeeAdSlot } from "@/components/ads/ChapMeeAdSlot";
import { PresentationReaderContentWithAds } from "@/components/ads/PresentationReaderContentWithAds";
import { ChapterCommentsSheet } from "@/components/reader/ChapterCommentsSheet";
import { focusReaderCommentsPanel } from "@/components/reader/ChapterCommentsPanel";
import { EpisodeListSheet } from "@/components/reader/EpisodeListSheet";
import { ReaderActionSheet } from "@/components/reader/ReaderActionSheet";
import { ReaderChapterMeta } from "@/components/reader/ReaderChapterMeta";
import { ReaderEndNavigation } from "@/components/reader/ReaderEndNavigation";
import { ReaderFooterCompact } from "@/components/reader/ReaderFooterCompact";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import { ReaderLayout } from "@/components/reader/ReaderLayout";
import { ReaderMobileBottomBar } from "@/components/reader/ReaderMobileBottomBar";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import { ChapterReactions } from "@/components/reader/ChapterReactions";
import { InlineCommentLayer } from "@/components/reader/inline-comments/InlineCommentLayer";
import { ReaderSettingsSheet } from "@/components/reader/ReaderSettingsSheet";
import { StoryAudioCTABox } from "@/components/reader/StoryAudioCTABox";
import { ReaderToast } from "@/components/reader/ReaderToast";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { ReadingProgressBar } from "@/components/reader/ReadingProgressBar";
import { ReadingProgressTracker } from "@/components/reader/ReadingProgressTracker";
import { ReadingScrollRestorer } from "@/components/reader/ReadingScrollRestorer";
import { useChapterPrefetch } from "@/hooks/useChapterPrefetch";
import type { ReaderAnalyticsContext } from "@/lib/analytics/trackReaderEvents";
import type { EpisodeReaderData } from "@/lib/episodes/getEpisodeReaderData";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { getStoryDetailHref } from "@/lib/stories/story-routes";
import type { CommentView } from "@/lib/comments/getComments";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";
import { isStoryOwner } from "@/lib/studio/ownership";
import type { StoryEpisode } from "@/lib/stories/getStoryBySlug";
import type { StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";
import type { ChapterReactionsSnapshot } from "@/types/reaction";
import type { InlineBlockCommentCounts } from "@/types/inline-comment";
import type { ShareCardPayload } from "@/types/share";
import type { StoryAudioQueueItem } from "@/src/lib/audio/audio-queue";

type ReaderPageProps = {
  data: EpisodeReaderData;
  analyticsContext: ReaderAnalyticsContext;
  userState: StoryUserState;
  episodes: StoryEpisode[];
  chaptersData: StoryChaptersResult;
  readingProgress: StoryReadingProgress | null;
  chapterReactions: ChapterReactionsSnapshot | null;
  comments: CommentView[];
  commentsUserId: string | null;
  episodeDescription: string;
  showReactions: boolean;
  showComments: boolean;
  showInlineComments?: boolean;
  inlineCommentCounts?: InlineBlockCommentCounts[];
  lockedContent?: boolean;
  afterContent?: ReactNode;
  contentUnitCount?: number;
  supportSlot?: ReactNode;
  storyAudioQueue?: StoryAudioQueueItem[];
  continueAudioItemId?: string | null;
  canShowStoryAudioAds?: boolean;
  canShowStoryAudioCta?: boolean;
};

export function ReaderPage({
  afterContent,
  analyticsContext,
  chaptersData,
  comments,
  commentsUserId,
  contentUnitCount = 0,
  data,
  episodeDescription,
  episodes,
  lockedContent = false,
  chapterReactions,
  inlineCommentCounts = [],
  readingProgress,
  showComments,
  showInlineComments = true,
  showReactions,
  supportSlot,
  userState,
  storyAudioQueue = [],
  continueAudioItemId = null,
  canShowStoryAudioAds = false,
  canShowStoryAudioCta = false
}: ReaderPageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [nonCriticalReady, setNonCriticalReady] = useState(false);

  const returnTo = data.chapterHref;
  const storyOwner = isStoryOwner(userState.userId, data.story.creatorUserId);
  const allowContentPrefetch = !lockedContent && !data.episode.contentUnavailableMessage;
  const currentPrefetchTarget = useMemo(
    () => ({
      allowContentPrefetch,
      chapterId: data.episode.id,
      contentHash: data.episode.contentHash,
      href: data.chapterHref,
      storyId: data.story.id,
      updatedAt: data.episode.updatedAt
    }),
    [
      allowContentPrefetch,
      data.chapterHref,
      data.episode.contentHash,
      data.episode.id,
      data.episode.updatedAt,
      data.story.id
    ]
  );
  const nextPrefetchTarget = useMemo(
    () =>
      data.nextChapterId && data.nextChapterHref
        ? {
            allowContentPrefetch: true,
            chapterId: data.nextChapterId,
            contentHash: data.nextChapterContentHash,
            href: data.nextChapterHref,
            storyId: data.story.id,
            updatedAt: data.nextChapterUpdatedAt
          }
        : null,
    [
      data.nextChapterContentHash,
      data.nextChapterHref,
      data.nextChapterId,
      data.nextChapterUpdatedAt,
      data.story.id
    ]
  );
  const previousPrefetchTarget = useMemo(
    () =>
      data.previousChapterId && data.previousChapterHref
        ? {
            allowContentPrefetch: true,
            chapterId: data.previousChapterId,
            contentHash: data.previousChapterContentHash,
            href: data.previousChapterHref,
            storyId: data.story.id,
            updatedAt: data.previousChapterUpdatedAt
          }
        : null,
    [
      data.previousChapterContentHash,
      data.previousChapterHref,
      data.previousChapterId,
      data.previousChapterUpdatedAt,
      data.story.id
    ]
  );
  const { prefetchNext, prefetchPrevious } = useChapterPrefetch({
    current: currentPrefetchTarget,
    currentContent: allowContentPrefetch
      ? {
          content: data.episode.content,
          source: "current",
          structuredContent: data.episode.structuredContent
        }
      : undefined,
    next: nextPrefetchTarget,
    previous: previousPrefetchTarget,
    storyId: data.story.id
  });

  useEffect(() => {
    setNonCriticalReady(false);
    const run = () => setNonCriticalReady(true);
    const win = window as Window & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };
    const idle = win.requestIdleCallback?.(run, { timeout: 900 });
    const timer = idle ? null : window.setTimeout(run, 450);

    return () => {
      if (idle) {
        win.cancelIdleCallback?.(idle);
      }
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [data.episode.id]);
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

  const openComments = () => {
    if (focusReaderCommentsPanel()) {
      return;
    }
    setCommentsOpen(true);
  };

  const readerMain = (
    <main className="reader-page mx-auto w-full px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:px-4 lg:max-w-none lg:px-1 lg:pb-10 xl:px-2">
      <ReaderHeader
        episodeNumber={data.episode.episodeNumber}
        episodeTitle={data.episode.title}
        onOpenComments={showComments ? openComments : undefined}
        onOpenEpisodeList={() => setEpisodeListOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        storyPublicCode={data.story.publicCode}
        storySlug={data.story.slug}
        storyTitle={data.story.title}
      />
      <ReaderToolbar
        className="-mx-2 px-2"
        commentsCount={comments.length}
        data={data}
        storyAudioHref={
          canShowStoryAudioCta && storyAudioQueue.length > 0 ? `${data.storyHref}#audio` : null
        }
        onOpenChapterList={() => setEpisodeListOpen(true)}
        onOpenComments={openComments}
        onOpenMenu={() => setMenuOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onPrefetchNext={() => prefetchNext("hover")}
        onPrefetchPrevious={() => prefetchPrevious("hover")}
      />
      <ReaderChapterMeta data={data} />
      {canShowStoryAudioCta ? (
        <StoryAudioCTABox
          authorId={data.story.creatorUserId}
          canShowAds={canShowStoryAudioAds}
          continueAudioItemId={continueAudioItemId}
          queue={storyAudioQueue}
          storyHref={getStoryDetailHref({ slug: data.story.slug, public_code: data.story.publicCode })}
          storyId={data.story.id}
        />
      ) : null}
      {data.episode.contentUnavailableMessage ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
          {data.episode.contentUnavailableMessage}
        </p>
      ) : null}
      <ChapMeeAdSlot
        authorId={data.story.creatorUserId ?? undefined}
        chapterId={data.episode.id}
        className={`${AD_SLOT_IN_FEED_CLASS} lg:hidden`}
        placementKey="reader_top_mobile"
        storyId={data.story.id}
      />
      <InlineCommentLayer
        chapterId={data.episode.id}
        contentHash={data.episode.contentHash}
        currentUserId={commentsUserId}
        enabled={showInlineComments && !lockedContent}
        initialBlockCounts={inlineCommentCounts}
        loggedIn={userState.isLoggedIn}
        returnTo={returnTo}
        storyId={data.story.id}
      >
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
      </InlineCommentLayer>
      {afterContent}
      {nonCriticalReady && !lockedContent && showReactions ? (
        <ChapterReactions
          chapterId={data.episode.id}
          initialSnapshot={chapterReactions}
          loggedIn={userState.isLoggedIn}
          returnTo={returnTo}
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
        <ReaderEndNavigation
          analyticsContext={analyticsContext}
          data={data}
          onPrefetchNext={() => prefetchNext("hover")}
          onPrefetchPrevious={() => prefetchPrevious("hover")}
        />
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
      <ReaderFooterCompact />
    </main>
  );

  return (
    <ReaderPreferencesProvider>
      <Suspense fallback={null}>
        <ReaderToast />
      </Suspense>
      <ReadingProgressBar />
      <ReaderAnalyticsTracker context={analyticsContext} />
      {!lockedContent ? (
        <>
          <ReadingProgressTracker
            episodeId={data.episode.id}
            returnTo={returnTo}
            storyId={data.story.id}
          />
          <ReadingScrollRestorer
            episodeId={data.episode.id}
            storyId={data.story.id}
          />
        </>
      ) : null}
      <AdSlotBudgetProvider>
        {showComments && !lockedContent ? (
          <ReaderLayout
            authorId={data.story.creatorUserId}
            chaptersData={chaptersData}
            comments={nonCriticalReady ? comments : []}
            commentsUserId={commentsUserId}
            currentEpisodeNumber={data.episode.episodeNumber}
            episodeId={data.episode.id}
            leftCollapsed={leftCollapsed}
            onToggleLeft={() => setLeftCollapsed((value) => !value)}
            readingProgress={readingProgress}
            returnTo={returnTo}
            shortEpisodes={episodes.length > 0 ? episodes : undefined}
            storyId={data.story.id}
            storyPublicCode={data.story.publicCode}
            storySlug={data.story.slug}
            storyTitle={data.story.title}
            supportSlot={supportSlot}
          >
            {readerMain}
          </ReaderLayout>
        ) : (
          <div className="mx-auto w-full max-w-[90rem] lg:px-4 xl:px-6">{readerMain}</div>
        )}
      </AdSlotBudgetProvider>
      {!lockedContent && showComments ? (
        <ReaderMobileBottomBar
          commentsCount={comments.length}
          data={data}
          onOpenChapterList={() => setEpisodeListOpen(true)}
          onOpenComments={openComments}
          onOpenSettings={() => setSettingsOpen(true)}
          onPrefetchNext={() => prefetchNext("hover")}
          onPrefetchPrevious={() => prefetchPrevious("hover")}
        />
      ) : null}
      <ReaderSettingsSheet onClose={() => setSettingsOpen(false)} open={settingsOpen} />
      <EpisodeListSheet
        currentEpisodeNumber={data.episode.episodeNumber}
        episodes={episodes}
        onClose={() => setEpisodeListOpen(false)}
        open={episodeListOpen}
        readingProgress={readingProgress}
        storyPublicCode={data.story.publicCode}
        storySlug={data.story.slug}
        storyTitle={data.story.title}
      />
      {showComments ? (
        <ChapterCommentsSheet
          comments={nonCriticalReady ? comments : []}
          currentUserId={commentsUserId}
          episodeId={data.episode.id}
          onClose={() => setCommentsOpen(false)}
          open={commentsOpen}
          returnTo={returnTo}
          storyId={data.story.id}
          storySlug={data.story.slug}
        />
      ) : null}
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

/** @deprecated Use ReaderPage — alias for chapter reader entry. */
export const ChapterReaderPage = ReaderPage;
