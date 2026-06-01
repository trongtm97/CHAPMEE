import type { AnalyticsEventName } from "@/types/analytics";

export type StoryRankingWindow = "24h" | "7d" | "all";

export type RankedStoryScore = {
  storyId: string;
  score: number;
};

export const storyRankingWeights = {
  open_story: 1,
  start_reading: 2,
  complete_chap: 5,
  next_chap_click: 4,
  save_story: 6,
  follow_creator: 8,
  comment_created: 3,
  report_created: -20,
  feed_read_more: 5,
  feed_skip: -2
} as const satisfies Partial<Record<AnalyticsEventName, number>>;

const validWindows = new Set<StoryRankingWindow>(["24h", "7d", "all"]);

export function getStoryRankingWindow(
  value: string | undefined
): StoryRankingWindow {
  if (value && validWindows.has(value as StoryRankingWindow)) {
    return value as StoryRankingWindow;
  }

  return "24h";
}

export function getStoryRankingStart(window: StoryRankingWindow) {
  if (window === "all") {
    return null;
  }

  const hours = window === "24h" ? 24 : 7 * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// MVP rule-based ranking. This intentionally combines reading depth,
// saves, comments, follow intent, Reels behavior, and report penalties
// instead of ranking by raw views alone.
// TODO: Replace or augment this with anti-fraud checks and a recommendation
// model when ChapMee has enough clean engagement data.
export function computeStoryScore(eventCounts: Record<string, number>) {
  return Object.entries(storyRankingWeights).reduce(
    (score, [eventName, weight]) =>
      score + (eventCounts[eventName] ?? 0) * weight,
    0
  );
}

export function sortStoryIdsByRanking(
  storyIds: string[],
  scores: Map<string, number>
) {
  return [...storyIds].sort(
    (first, second) => (scores.get(second) ?? 0) - (scores.get(first) ?? 0)
  );
}
