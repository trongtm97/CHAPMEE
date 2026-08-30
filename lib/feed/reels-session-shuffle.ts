import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import type { FeedCandidate } from "@/types/feed-mixer";

/** ponytail: mulberry32 — deterministic shuffle per session seed, O(n) */
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createReelsShuffleSeed(): number {
  return (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0;
}

export function reelsMixerScoreWithJitter(
  candidate: FeedCandidate,
  seed: number,
  amplitude = 0.1
): number {
  const key = candidateKeyFromFeed(candidate);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const rand = mulberry32((seed ^ hash) >>> 0);
  return candidate.mixerScore + rand() * amplitude;
}

function shuffleInPlace<T>(items: T[], rand: () => number) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Tier shuffle: keep rough quality bands, permute within each band. */
export function shuffleReelsFeedCandidates(
  candidates: FeedCandidate[],
  seed: number
): FeedCandidate[] {
  if (!Number.isFinite(seed) || candidates.length <= 1) {
    return candidates;
  }

  const rand = mulberry32(seed >>> 0);
  const buckets = new Map<number, FeedCandidate[]>();

  for (const candidate of candidates) {
    const tier = Math.round(candidate.mixerScore * 24);
    const bucket = buckets.get(tier) ?? [];
    bucket.push(candidate);
    buckets.set(tier, bucket);
  }

  const tiers = [...buckets.keys()].sort((a, b) => b - a);
  const mixed: FeedCandidate[] = [];

  for (const tier of tiers) {
    const bucket = [...(buckets.get(tier) ?? [])];
    shuffleInPlace(bucket, rand);
    mixed.push(...bucket);
  }

  return mixed;
}

/** Round-robin across stories so high-volume stories do not cluster in score tiers. */
export function interleaveReelsByStory(
  candidates: FeedCandidate[]
): FeedCandidate[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  const byStory = new Map<string, FeedCandidate[]>();
  for (const candidate of candidates) {
    const queue = byStory.get(candidate.storyId) ?? [];
    queue.push(candidate);
    byStory.set(candidate.storyId, queue);
  }

  const storyOrder = [...byStory.keys()].sort((left, right) => {
    const leftTop = byStory.get(left)?.[0]?.mixerScore ?? 0;
    const rightTop = byStory.get(right)?.[0]?.mixerScore ?? 0;
    return rightTop - leftTop;
  });

  const interleaved: FeedCandidate[] = [];
  let placed = true;
  while (placed && interleaved.length < candidates.length) {
    placed = false;
    for (const storyId of storyOrder) {
      const queue = byStory.get(storyId);
      const next = queue?.shift();
      if (next) {
        interleaved.push(next);
        placed = true;
      }
    }
  }

  return interleaved;
}

export const REELS_DIVERSITY_RULES = {
  maxConsecutiveSameAuthor: 1,
  maxConsecutiveSameStory: 1,
  maxSameStoryInWindow: 1,
  storyWindowSize: 12
} as const;

if (process.env.CHAPMEE_ASSERT_REELS_SHUFFLE === "1") {
  const base = [
    { itemId: "a", mixerScore: 0.9 },
    { itemId: "b", mixerScore: 0.9 },
    { itemId: "c", mixerScore: 0.5 }
  ] as FeedCandidate[];
  const a = shuffleReelsFeedCandidates(base, 42).map((c) => c.itemId).join(",");
  const b = shuffleReelsFeedCandidates(base, 42).map((c) => c.itemId).join(",");
  const c = shuffleReelsFeedCandidates(base, 99).map((c) => c.itemId).join(",");
  console.assert(a === b);
  console.assert(a !== c || base.length <= 1);
}
