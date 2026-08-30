"use client";

import { trackEvent } from "@/lib/analytics/trackEvent";
import { analyticsEvents } from "@/lib/analytics/events";
import {
  trackChapterComplete,
  trackChapterStart,
  trackNextChapterClick as trackNextChapterClickEvent,
  trackUserAction
} from "@/lib/tracking/track-client";
import {
  trackTaxonomyChapterComplete,
  trackTaxonomyChapterStart
} from "@/lib/analytics/track-taxonomy-events";
import { recordFanScoreFromClient } from "@/lib/fans/fan-score";

export type ReaderAnalyticsContext = {
  creatorId?: string | null;
  storyId: string;
  episodeId: string;
  episodeNumber: number;
  slug: string;
  wordCount?: number | null;
  taxonomyTermIds?: string[];
  mainGenreId?: string | null;
  sourceSurface?: string;
};

const completedChapters = new Set<string>();

function readerMetadata(
  context: ReaderAnalyticsContext,
  progressPercent?: number,
  extra?: Record<string, string | number | boolean | null>
) {
  return {
    episode_id: context.episodeId,
    episode_number: context.episodeNumber,
    progress_percent: progressPercent ?? null,
    slug: context.slug,
    story_id: context.storyId,
    word_count: context.wordCount ?? null,
    ...extra
  };
}

function chapterMetadata(context: ReaderAnalyticsContext, progressPercent?: number) {
  return {
    storyId: context.storyId,
    slug: context.slug,
    episodeNumber: context.episodeNumber,
    progressPercent
  };
}

export function trackReaderProgress(
  context: ReaderAnalyticsContext,
  progressPercent: 25 | 50 | 75
) {
  void trackUserAction({
    surface: "chapter_detail",
    actionType: "read_progress",
    itemType: "chapter",
    itemId: context.episodeId,
    storyId: context.storyId,
    chapterId: context.episodeId,
    valueNumeric: progressPercent,
    metadata: { slug: context.slug, episode_number: context.episodeNumber }
  });

  const eventNameByProgress = {
    25: analyticsEvents.scroll25,
    50: analyticsEvents.scroll50,
    75: analyticsEvents.scroll75
  } as const;

  void trackEvent({
    eventName: eventNameByProgress[progressPercent],
    metadata: readerMetadata(context, progressPercent),
    targetId: context.episodeId,
    targetType: "episode"
  });
}

function taxonomyReaderPayload(context: ReaderAnalyticsContext) {
  if (!context.taxonomyTermIds?.length) {
    return null;
  }
  return {
    storyId: context.storyId,
    chapterId: context.episodeId,
    taxonomyTermIds: context.taxonomyTermIds,
    mainGenreId: context.mainGenreId ?? null,
    sourceSurface: context.sourceSurface ?? "catalog"
  };
}

export function trackStartReading(context: ReaderAnalyticsContext) {
  completedChapters.delete(context.episodeId);

  void trackChapterStart(
    context.episodeId,
    undefined,
    chapterMetadata(context, 0)
  );

  void trackEvent({
    eventName: analyticsEvents.chapterOpened,
    metadata: readerMetadata(context, 0),
    targetId: context.episodeId,
    targetType: "episode"
  });

  void trackEvent({
    eventName: analyticsEvents.startReading,
    metadata: readerMetadata(context, 0),
    targetId: context.episodeId,
    targetType: "episode"
  });

  const taxonomyPayload = taxonomyReaderPayload(context);
  if (taxonomyPayload) {
    void trackTaxonomyChapterStart(taxonomyPayload);
  }
}

export function trackCompleteChapterOnce(
  context: ReaderAnalyticsContext,
  source: "scroll_end" | "next_chap_click"
) {
  if (completedChapters.has(context.episodeId)) {
    return;
  }

  completedChapters.add(context.episodeId);
  void trackChapterComplete(
    context.episodeId,
    undefined,
    chapterMetadata(context, 100)
  );
  void trackEvent({
    eventName: analyticsEvents.completeChap,
    metadata: readerMetadata(context, 100, { source }),
    targetId: context.episodeId,
    targetType: "episode"
  });

  const taxonomyPayload = taxonomyReaderPayload(context);
  if (taxonomyPayload) {
    void trackTaxonomyChapterComplete({
      ...taxonomyPayload,
      readDuration: null,
      scrollDepth: 100
    });
  }

  void recordFanScoreFromClient({
    authorId: context.creatorId ?? null,
    eventKey: "read_chapter",
    metadata: {
      episode_id: context.episodeId,
      episode_number: context.episodeNumber,
      source,
      story_id: context.storyId
    },
    sourceId: context.episodeId,
    storyId: context.storyId
  });
}

export function trackNextChapterClick(
  context: ReaderAnalyticsContext,
  nextEpisodeNumber: number
) {
  trackCompleteChapterOnce(context, "next_chap_click");
  void trackNextChapterClickEvent(
    context.episodeId,
    undefined,
    chapterMetadata(context, 100)
  );
  void trackEvent({
    eventName: analyticsEvents.nextChapClick,
    metadata: readerMetadata(context, 100, {
      next_episode_number: nextEpisodeNumber
    }),
    targetId: context.episodeId,
    targetType: "episode"
  });
}
