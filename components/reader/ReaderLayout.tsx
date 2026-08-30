"use client";



import type { ReactNode } from "react";

import { ReaderDesktopRailAd } from "@/components/ads/ReaderDesktopRailAd";

import { ChapterCommentsPanel } from "@/components/reader/ChapterCommentsPanel";

import { ChapterListSidebar } from "@/components/reader/ChapterListSidebar";

import type { CommentView } from "@/lib/comments/getComments";

import type { StoryChaptersResult, StoryReadingProgress } from "@/types/chapter";



type ReaderLayoutProps = {

  children: ReactNode;

  storyId: string;

  storySlug: string;

  storyPublicCode: string;

  storyTitle: string;

  currentEpisodeNumber: number;

  chaptersData: StoryChaptersResult;

  shortEpisodes?: StoryChaptersResult["chapters"];

  readingProgress: StoryReadingProgress | null;

  comments: CommentView[];

  commentsUserId: string | null;

  returnTo: string;

  episodeId: string;

  authorId?: string | null;

  leftCollapsed: boolean;

  onToggleLeft: () => void;

  supportSlot?: ReactNode;

};



const stickyColumnClass =

  "lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100dvh-5.5rem)] lg:self-start";



export function ReaderLayout({

  authorId,

  chaptersData,

  children,

  comments,

  commentsUserId,

  currentEpisodeNumber,

  episodeId,

  leftCollapsed,

  onToggleLeft,

  readingProgress,

  returnTo,

  shortEpisodes,

  storyId,

  storyPublicCode,

  storySlug,

  storyTitle,

  supportSlot

}: ReaderLayoutProps) {

  const innerGridClass = leftCollapsed

    ? "lg:grid-cols-[3rem_minmax(0,1fr)_13rem] xl:grid-cols-[3rem_minmax(0,1fr)_13.5rem]"

    : "lg:grid-cols-[11.5rem_minmax(0,1fr)_13rem] xl:grid-cols-[12rem_minmax(0,1fr)_13.5rem]";



  return (

    <div className="reader-layout w-full">

      <div className="mx-auto flex w-full max-w-[100rem] items-start justify-center gap-1 lg:gap-2 xl:gap-3 2xl:gap-4">

        <div

          className={`${stickyColumnClass} hidden w-[7rem] shrink-0 xl:flex xl:flex-col 2xl:w-[10rem]`}

        >

          <ReaderDesktopRailAd

            authorId={authorId ?? undefined}

            chapterId={episodeId}

            side="left"

            storyId={storyId}

          />

        </div>



        <div

          className={`grid min-w-0 flex-1 grid-cols-1 items-start gap-3 lg:gap-3 xl:gap-4 ${innerGridClass}`}

        >

          <div className={`${stickyColumnClass} hidden min-w-0 lg:block`}>

            <ChapterListSidebar

              collapsed={leftCollapsed}

              currentEpisodeNumber={currentEpisodeNumber}

              initialChaptersData={chaptersData}

              onToggleCollapse={onToggleLeft}

              readingProgress={readingProgress}

              shortEpisodes={shortEpisodes}

              storyId={storyId}

              storyPublicCode={storyPublicCode}

              storySlug={storySlug}

              storyTitle={storyTitle}

            />

          </div>

          <div className="reader-layout-center min-w-0">{children}</div>

          <div

            className={`${stickyColumnClass} hidden min-w-0 flex-col gap-2 lg:flex lg:overflow-hidden`}

          >

            {supportSlot}

            <ChapterCommentsPanel

              comments={comments}

              currentUserId={commentsUserId}

              episodeId={episodeId}

              returnTo={returnTo}

              storyId={storyId}

              storySlug={storySlug}

            />

          </div>

        </div>



        <div

          className={`${stickyColumnClass} hidden w-[7rem] shrink-0 xl:flex xl:flex-col 2xl:w-[10rem]`}

        >

          <ReaderDesktopRailAd

            authorId={authorId ?? undefined}

            chapterId={episodeId}

            side="right"

            storyId={storyId}

          />

        </div>

      </div>

    </div>

  );

}

