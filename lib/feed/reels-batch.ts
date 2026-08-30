import {
  fetchReelCatalogCandidates,
  filterCandidates,
  normalizeReelsFeedCandidate,
  sortByScore
} from "@/lib/feed/catalog";
import { enforceFeedDiversity } from "@/lib/fairness/diversity";
import {
  interleaveReelsByStory,
  REELS_DIVERSITY_RULES,
  reelsMixerScoreWithJitter,
  shuffleReelsFeedCandidates
} from "@/lib/feed/reels-session-shuffle";
import type { DatabaseClient } from "@/lib/db/types";
import type { FeedCandidate } from "@/types/feed-mixer";

/** Max chapters from the same story in one reels batch (prevents one story dominating). */
const MAX_EPISODES_PER_STORY = 2;

export const REELS_PAGE_BATCH_SIZE = 64;

function capEpisodesPerStory(
  candidates: FeedCandidate[],
  maxPerStory: number
): FeedCandidate[] {
  const counts = new Map<string, number>();
  const capped: FeedCandidate[] = [];

  for (const candidate of candidates) {
    const used = counts.get(candidate.storyId) ?? 0;
    if (used >= maxPerStory) {
      continue;
    }
    counts.set(candidate.storyId, used + 1);
    capped.push(candidate);
  }

  return capped;
}

/** Fast deterministic reels batch — no heavy fairness/mixer pipeline. */
export async function buildReelsBatchFast(
  db: DatabaseClient,
  options: {
    batchSize: number;
    shuffleSeed: number;
    excludeKeys?: Set<string>;
    recentlySeenKeys?: Set<string>;
  }
): Promise<FeedCandidate[]> {
  const catalog = await fetchReelCatalogCandidates(db, 280);
  const filtered = filterCandidates(catalog, {
    excludeKeys: options.excludeKeys,
    recentlySeenKeys: options.recentlySeenKeys,
    skipRecent: false
  }).map(normalizeReelsFeedCandidate);

  const capped = capEpisodesPerStory(filtered, MAX_EPISODES_PER_STORY);
  const scored = sortByScore(capped, (candidate) =>
    reelsMixerScoreWithJitter(candidate, options.shuffleSeed)
  );
  const interleaved = interleaveReelsByStory(scored);
  const shuffled = shuffleReelsFeedCandidates(interleaved, options.shuffleSeed);

  return enforceFeedDiversity(shuffled, {
    targetLength: options.batchSize,
    rerankRules: {
      excludeKeys: options.excludeKeys,
      deprioritizeSeenKeys: options.recentlySeenKeys,
      ...REELS_DIVERSITY_RULES
    },
    preservePlacementOrder: true
  }).map(normalizeReelsFeedCandidate);
}
