import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import type { FeedCandidate } from "@/types/feed-mixer";

export type RerankRules = {
  maxConsecutiveSameAuthor?: number;
  maxConsecutiveSameStory?: number;
  maxSameStoryInWindow?: number;
  storyWindowSize?: number;
  maxConsecutiveSameGenre?: number;
  excludeKeys?: Set<string>;
  deprioritizeSeenKeys?: Set<string>;
};

const DEFAULT_RULES: Required<
  Pick<
    RerankRules,
    | "maxConsecutiveSameAuthor"
    | "maxConsecutiveSameStory"
    | "maxSameStoryInWindow"
    | "storyWindowSize"
    | "maxConsecutiveSameGenre"
  >
> = {
  maxConsecutiveSameAuthor: 1,
  maxConsecutiveSameStory: 2,
  maxSameStoryInWindow: 3,
  storyWindowSize: 30,
  maxConsecutiveSameGenre: 3
};

function storyCountInWindow(items: FeedCandidate[], storyId: string, window: number) {
  const slice = items.slice(-window);
  return slice.filter((i) => i.storyId === storyId).length;
}

function violatesAuthorStreak(items: FeedCandidate[], candidate: FeedCandidate, max: number) {
  if (max <= 0 || items.length === 0) return false;
  let streak = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].authorUserId !== candidate.authorUserId) break;
    streak += 1;
  }
  return streak >= max;
}

function violatesStoryStreak(items: FeedCandidate[], candidate: FeedCandidate, max: number) {
  if (max <= 0 || items.length === 0) return false;
  let streak = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].storyId !== candidate.storyId) break;
    streak += 1;
  }
  return streak >= max;
}

function violatesGenreStreak(items: FeedCandidate[], candidate: FeedCandidate, max: number) {
  if (!candidate.genreSlug || max <= 0 || items.length === 0) return false;
  let streak = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].genreSlug !== candidate.genreSlug) break;
    streak += 1;
  }
  return streak >= max;
}

export function rerankAndDeduplicate(
  items: FeedCandidate[],
  rules: RerankRules = {}
): FeedCandidate[] {
  const mergedRules = { ...DEFAULT_RULES, ...rules };
  const seen = new Set<string>();
  const primary: FeedCandidate[] = [];
  const deferred: FeedCandidate[] = [];

  const sorted = [...items].sort((a, b) => b.mixerScore - a.mixerScore);

  for (const candidate of sorted) {
    const key = candidateKeyFromFeed(candidate);
    if (seen.has(key)) continue;
    if (rules.excludeKeys?.has(key)) continue;

    if (rules.deprioritizeSeenKeys?.has(key)) {
      deferred.push(candidate);
      seen.add(key);
      continue;
    }

    const authorViolation = violatesAuthorStreak(
      primary,
      candidate,
      mergedRules.maxConsecutiveSameAuthor
    );
    const storyStreakViolation = violatesStoryStreak(
      primary,
      candidate,
      mergedRules.maxConsecutiveSameStory
    );
    const storyViolation =
      storyCountInWindow(
        primary,
        candidate.storyId,
        mergedRules.storyWindowSize
      ) >= mergedRules.maxSameStoryInWindow;
    const genreViolation = violatesGenreStreak(
      primary,
      candidate,
      mergedRules.maxConsecutiveSameGenre
    );

    if (authorViolation || storyStreakViolation || storyViolation || genreViolation) {
      deferred.push(candidate);
    } else {
      primary.push(candidate);
    }
    seen.add(key);
  }

  const relaxed: FeedCandidate[] = [];
  for (const candidate of deferred) {
    const key = candidateKeyFromFeed(candidate);
    if (rules.excludeKeys?.has(key)) continue;

    const storyStreakViolation = violatesStoryStreak(
      [...primary, ...relaxed],
      candidate,
      mergedRules.maxConsecutiveSameStory
    );
    const storyViolation =
      storyCountInWindow(
        [...primary, ...relaxed],
        candidate.storyId,
        mergedRules.storyWindowSize
      ) >= mergedRules.maxSameStoryInWindow;

    if (!storyStreakViolation && !storyViolation) {
      relaxed.push(candidate);
    }
  }

  return [...primary, ...relaxed];
}
