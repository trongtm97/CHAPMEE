import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import { rerankAndDeduplicate, type RerankRules } from "@/lib/feed/rerank";
import type { FeedCandidate } from "@/types/feed-mixer";

function authorShareInFeed(items: FeedCandidate[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.authorUserId, (counts.get(item.authorUserId) ?? 0) + 1);
  }
  const total = items.length || 1;
  return [...counts.entries()].map(([authorId, count]) => ({
    authorId,
    sharePercent: (count / total) * 100
  }));
}

function violatesAuthorCapInFeed(
  feed: FeedCandidate[],
  candidate: FeedCandidate,
  maxAuthorSharePercent: number
) {
  if (feed.length === 0) return false;
  const total = feed.length + 1;
  let authorCount = 0;
  for (const item of feed) {
    if (item.authorUserId === candidate.authorUserId) authorCount += 1;
  }
  authorCount += 1;
  return (authorCount / total) * 100 > maxAuthorSharePercent;
}

function violatesGenreCapInFeed(
  feed: FeedCandidate[],
  candidate: FeedCandidate,
  maxGenreSharePercent: number
) {
  if (feed.length === 0 || maxGenreSharePercent >= 100) return false;
  const genreKey = candidate.mainGenreTermId ?? candidate.genreSlug ?? "_none";
  const total = feed.length + 1;
  let genreCount = 0;
  for (const item of feed) {
    const key = item.mainGenreTermId ?? item.genreSlug ?? "_none";
    if (key === genreKey) genreCount += 1;
  }
  genreCount += 1;
  return (genreCount / total) * 100 > maxGenreSharePercent;
}

function violatesPresentationModeCapInFeed(
  feed: FeedCandidate[],
  candidate: FeedCandidate,
  maxModeSharePercent: number
) {
  if (feed.length === 0 || maxModeSharePercent >= 100) return false;
  const modeKey = candidate.presentationModeSlug ?? "_none";
  if (modeKey === "_none") return false;
  const total = feed.length + 1;
  let modeCount = 0;
  for (const item of feed) {
    if ((item.presentationModeSlug ?? "_none") === modeKey) modeCount += 1;
  }
  modeCount += 1;
  return (modeCount / total) * 100 > maxModeSharePercent;
}

function underrepresentedPresentationModes(
  feed: FeedCandidate[],
  pool: FeedCandidate[],
  minSharePercent: number
) {
  if (minSharePercent <= 0 || feed.length === 0) return new Set<string>();
  const total = feed.length;
  const counts = new Map<string, number>();
  for (const item of feed) {
    const mode = item.presentationModeSlug;
    if (!mode) continue;
    counts.set(mode, (counts.get(mode) ?? 0) + 1);
  }
  const under = new Set<string>();
  for (const item of pool) {
    const mode = item.presentationModeSlug;
    if (!mode) continue;
    const share = ((counts.get(mode) ?? 0) / total) * 100;
    if (share < minSharePercent) under.add(mode);
  }
  return under;
}

/**
 * Enforce feed diversity: streak limits, story window, author and genre concentration caps.
 */
export function enforceFeedDiversity(
  items: FeedCandidate[],
  options: {
    maxAuthorSharePerFeedPercent?: number;
    maxMainGenreSharePercent?: number;
    minPresentationModeSharePercent?: number;
    rerankRules?: RerankRules;
    targetLength?: number;
    /** When true, keep greedy placement order instead of re-sorting by score in rerank. */
    preservePlacementOrder?: boolean;
  } = {}
): FeedCandidate[] {
  const maxAuthorShare = options.maxAuthorSharePerFeedPercent ?? 25;
  const maxGenreShare = options.maxMainGenreSharePercent ?? 100;
  const minModeShare = options.minPresentationModeSharePercent ?? 0;
  const targetLength = options.targetLength ?? items.length;
  const maxSameStoryInWindow = options.rerankRules?.maxSameStoryInWindow ?? 3;
  const storyWindowSize = options.rerankRules?.storyWindowSize ?? 30;
  const maxConsecutiveSameStory = options.rerankRules?.maxConsecutiveSameStory ?? 2;
  const pool = [...items].sort((a, b) => b.mixerScore - a.mixerScore);
  const deferred: FeedCandidate[] = [];
  const result: FeedCandidate[] = [];
  const used = new Set<string>();

  const tryPlace = (candidate: FeedCandidate, strict: boolean) => {
    const key = candidateKeyFromFeed(candidate);
    if (used.has(key)) return false;

    if (strict) {
      const last = result[result.length - 1];
      if (last && last.authorUserId === candidate.authorUserId) return false;
      if (violatesAuthorCapInFeed(result, candidate, maxAuthorShare)) return false;
      if (violatesGenreCapInFeed(result, candidate, maxGenreShare)) return false;
      if (
        violatesPresentationModeCapInFeed(
          result,
          candidate,
          Math.max(maxGenreShare, 40)
        )
      ) {
        return false;
      }
      const lastStory = result[result.length - 1];
      if (
        maxConsecutiveSameStory > 0 &&
        lastStory &&
        lastStory.storyId === candidate.storyId
      ) {
        let streak = 1;
        for (let i = result.length - 2; i >= 0; i -= 1) {
          if (result[i].storyId !== candidate.storyId) break;
          streak += 1;
        }
        if (streak >= maxConsecutiveSameStory) return false;
      }
      const storyWindow = result.slice(-storyWindowSize);
      const storyCount = storyWindow.filter((i) => i.storyId === candidate.storyId).length;
      if (storyCount >= maxSameStoryInWindow) return false;
    }

    used.add(key);
    result.push(candidate);
    return true;
  };

  const underModes = underrepresentedPresentationModes(result, pool, minModeShare);
  const modeBoosted = [...pool].sort((a, b) => {
    const aBoost =
      a.presentationModeSlug && underModes.has(a.presentationModeSlug) ? 1 : 0;
    const bBoost =
      b.presentationModeSlug && underModes.has(b.presentationModeSlug) ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    return b.mixerScore - a.mixerScore;
  });

  for (const candidate of modeBoosted) {
    if (!tryPlace(candidate, true)) {
      deferred.push(candidate);
    }
    if (result.length >= targetLength) break;
  }

  for (const candidate of deferred) {
    if (result.length >= targetLength) break;
    if (!tryPlace(candidate, false)) {
      const key = candidateKeyFromFeed(candidate);
      if (!used.has(key)) {
        used.add(key);
        result.push(candidate);
      }
    }
  }

  for (const candidate of pool) {
    if (result.length >= targetLength) break;
    const key = candidateKeyFromFeed(candidate);
    if (!used.has(key)) {
      used.add(key);
      result.push(candidate);
    }
  }

  if (options.preservePlacementOrder) {
    const deduped: FeedCandidate[] = [];
    const seenKeys = new Set<string>();
    for (const candidate of result) {
      const key = candidateKeyFromFeed(candidate);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      deduped.push(candidate);
      if (deduped.length >= targetLength) break;
    }
    if (deduped.length > 0) {
      return deduped;
    }
    return items.slice(0, targetLength);
  }

  const reranked = rerankAndDeduplicate(result, options.rerankRules ?? {});

  if (reranked.length >= targetLength) {
    return reranked.slice(0, targetLength);
  }

  return reranked.length > 0 ? reranked : items.slice(0, targetLength);
}

export function summarizeFeedDiversity(items: FeedCandidate[]) {
  return {
    authorShares: authorShareInFeed(items).sort((a, b) => b.sharePercent - a.sharePercent),
    uniqueAuthors: new Set(items.map((i) => i.authorUserId)).size,
    uniqueStories: new Set(items.map((i) => i.storyId)).size
  };
}
