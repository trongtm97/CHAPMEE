"use client";

import { trackEvent } from "@/lib/analytics/trackEvent";
import { analyticsEvents } from "@/lib/analytics/events";
import { recordFanScoreFromClient } from "@/lib/fans/fan-score";

export type ReaderAnalyticsContext = {
  creatorId?: string | null;
  storyId: string;
  episodeId: string;
  episodeNumber: number;
  slug: string;
  wordCount?: number | null;
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

export function trackReaderProgress(
  context: ReaderAnalyticsContext,
  progressPercent: 25 | 50 | 75
) {
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

export function trackStartReading(context: ReaderAnalyticsContext) {
  completedChapters.delete(context.episodeId);

  void trackEvent({
    eventName: analyticsEvents.startReading,
    metadata: readerMetadata(context, 0),
    targetId: context.episodeId,
    targetType: "episode"
  });
}

export function trackCompleteChapterOnce(
  context: ReaderAnalyticsContext,
  source: "scroll_end" | "next_chap_click"
) {
  if (completedChapters.has(context.episodeId)) {
    return;
  }

  completedChapters.add(context.episodeId);
  void trackEvent({
    eventName: analyticsEvents.completeChap,
    metadata: readerMetadata(context, 100, { source }),
    targetId: context.episodeId,
    targetType: "episode"
  });

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
  void trackEvent({
    eventName: analyticsEvents.nextChapClick,
    metadata: readerMetadata(context, 100, {
      next_episode_number: nextEpisodeNumber
    }),
    targetId: context.episodeId,
    targetType: "episode"
  });
}
