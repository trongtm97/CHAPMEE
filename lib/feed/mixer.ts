import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import { reelsMixerScoreWithJitter } from "@/lib/feed/reels-session-shuffle";
import type {
  CandidatePoolId,
  CandidatePools,
  FeedCandidate,
  PoolWeights
} from "@/types/feed-mixer";

export function allocatePoolSlots(weights: PoolWeights, limit: number) {
  const entries = Object.entries(weights).filter(([, w]) => (w ?? 0) > 0) as [
    CandidatePoolId,
    number
  ][];
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  if (sum <= 0 || limit <= 0) return new Map<CandidatePoolId, number>();

  const slots = new Map<CandidatePoolId, number>();
  let assigned = 0;

  for (const [pool, weight] of entries) {
    const count = Math.floor((weight / sum) * limit);
    slots.set(pool, count);
    assigned += count;
  }

  let remainder = limit - assigned;
  const order = [...entries].sort((a, b) => b[1] - a[1]);
  let idx = 0;
  while (remainder > 0 && order.length > 0) {
    const [pool] = order[idx % order.length];
    slots.set(pool, (slots.get(pool) ?? 0) + 1);
    remainder -= 1;
    idx += 1;
  }

  return slots;
}

export function mixCandidatePools(
  pools: CandidatePools,
  weights: PoolWeights,
  limit: number,
  options?: { shuffleSeed?: number }
): FeedCandidate[] {
  const target = Math.max(limit, limit + 20);
  const slots = allocatePoolSlots(weights, target);
  const used = new Set<string>();
  const queues = new Map<CandidatePoolId, FeedCandidate[]>();
  const shuffleSeed = options?.shuffleSeed;
  const scorePick = (candidate: FeedCandidate) =>
    shuffleSeed != null
      ? reelsMixerScoreWithJitter(candidate, shuffleSeed)
      : candidate.mixerScore;

  for (const [poolId, take] of slots) {
    const sorted = [...(pools[poolId] ?? [])].sort(
      (a, b) => scorePick(b) - scorePick(a)
    );
    const picked: FeedCandidate[] = [];
    for (const candidate of sorted) {
      if (picked.length >= take) break;
      const key = candidateKeyFromFeed(candidate);
      if (used.has(key)) continue;
      used.add(key);
      picked.push({ ...candidate, pool: poolId });
    }
    queues.set(poolId, picked);
  }

  const poolOrder = Object.keys(weights).sort(
    (a, b) => (weights[b as CandidatePoolId] ?? 0) - (weights[a as CandidatePoolId] ?? 0)
  ) as CandidatePoolId[];
  if (shuffleSeed != null && poolOrder.length > 1) {
    const rotateBy = shuffleSeed % poolOrder.length;
    poolOrder.push(...poolOrder.splice(0, rotateBy));
  }

  const mixed: FeedCandidate[] = [];
  let progress = true;
  while (mixed.length < target && progress) {
    progress = false;
    for (const poolId of poolOrder) {
      const queue = queues.get(poolId);
      const next = queue?.shift();
      if (next) {
        mixed.push(next);
        progress = true;
      }
    }
  }

  if (mixed.length < target) {
    const leftovers = poolOrder.flatMap((poolId) => pools[poolId] ?? []);
    leftovers.sort((a, b) => scorePick(b) - scorePick(a));
    for (const candidate of leftovers) {
      if (mixed.length >= target) break;
      const key = candidateKeyFromFeed(candidate);
      if (used.has(key)) continue;
      used.add(key);
      mixed.push({ ...candidate, pool: candidate.pool });
    }
  }

  return mixed;
}
