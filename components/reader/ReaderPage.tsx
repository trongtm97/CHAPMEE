"use client";

import { Suspense, useState, type ReactNode } from "react";
import { ReaderAnalyticsTracker } from "@/components/analytics/ReaderAnalyticsTracker";
import { EpisodeListSheet } from "@/components/reader/EpisodeListSheet";
import { ReaderActionSheet } from "@/components/reader/ReaderActionSheet";
import { ReaderToast } from "@/components/reader/ReaderToast";
import { ReaderChapterMeta } from "@/components/reader/ReaderChapterMeta";
import { ReaderCommentsPreview } from "@/components/reader/ReaderCommentsPreview";
import { ReaderContent } from "@/components/reader/ReaderContent";
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
};

export function ReaderPage({
  afterContent,
  analyticsContext,
  comments,
  commentsUserId,
  data,
  episodeDescription,
  episodes,
  lockedContent = false,
  reaction,
  showComments,
  showReactions,
  userState
}: ReaderPageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [episodeListOpen, setEpisodeListOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const returnTo = `/stories/${data.story.slug}/episodes/${data.episode.episodeNumber}`;
  const storyOwner = isStoryOwner(userState.userId, data.story.creatorUserId);
  const sharePayload: ShareCardPayload = {
    authorName: data.story.creatorName,
    backgroundUrl: data.episode.backgroundImageUrl ?? data.story.coverUrl ?? null,
    ctaLabel: "Lướt truyện này trên ChapMee",
    excerpt: episodeDescription,
    creatorId: data.story.creatorId,
    genreName: data.story.genreName,
    hook: data.story.hook,
    kind: "swipe",
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
        <ReaderHeader
          episodeNumber={data.episode.episodeNumber}
          episodeTitle={data.episode.title}
          onOpenEpisodeList={() => setEpisodeListOpen(true)}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          storySlug={data.story.slug}
          storyTitle={data.story.title}
        />
        <ReaderChapterMeta data={data} />
        <ReaderContent content={data.episode.content} />
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
          <ReaderEndNavigation analyticsContext={analyticsContext} data={data} />
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
      </div>
      <ReaderSettingsSheet onClose={() => setSettingsOpen(false)} open={settingsOpen} />
      <EpisodeListSheet
        currentEpisodeNumber={data.episode.episodeNumber}
        episodes={episodes}
        onClose={() => setEpisodeListOpen(false)}
        open={episodeListOpen}
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
        storySlug={data.story.slug}
      />
    </ReaderPreferencesProvider>
  );
}
