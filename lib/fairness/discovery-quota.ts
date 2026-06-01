import { candidateKeyFromFeed } from "@/lib/feed/catalog";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { loadFairnessAlertThresholds } from "@/lib/fairness/thresholds";
import type { CandidatePools, FeedCandidate } from "@/types/feed-mixer";

const QUOTA_POOLS: Array<{
  pool: keyof CandidatePools;
  resolvePercent: (
    thresholds: Awaited<ReturnType<typeof loadFairnessAlertThresholds>>,
    scoring: ReturnType<typeof buildScoringConfig>
  ) => number;
}> = [
  {
    pool: "new_author",
    resolvePercent: (thresholds) => thresholds.minNewAuthorSlotsPercent
  },
  {
    pool: "under_exposed",
    resolvePercent: (thresholds) => thresholds.minUnderExposedSlotsPercent
  },
  {
    pool: "long_tail_quality",
    resolvePercent: (_thresholds, scoring) => scoring.fairness.minLongTailSlotsPercent
  }
];

function slotCount(limit: number, percent: number) {
  return Math.max(0, Math.floor((limit * percent) / 100));
}

export async function ensureMinimumDiscoveryQuota(
  items: FeedCandidate[],
  pools: CandidatePools,
  _surface: string,
  limit: number
): Promise<FeedCandidate[]> {
  const thresholds = await loadFairnessAlertThresholds();
  const scoring = buildScoringConfig(await getAlgorithmConfig());

  const used = new Set(items.map(candidateKeyFromFeed));
  const result = [...items];

  for (const rule of QUOTA_POOLS) {
    const percent = rule.resolvePercent(thresholds, scoring);
    const needed = slotCount(limit, percent);
    if (needed <= 0) continue;

    const present = result.filter((item) => item.pool === rule.pool).length;
    const inject = Math.max(0, needed - present);
    const queue = [...(pools[rule.pool] ?? [])].sort((a, b) => b.mixerScore - a.mixerScore);

    let added = 0;
    for (const candidate of queue) {
      if (added >= inject) break;
      const key = candidateKeyFromFeed(candidate);
      if (used.has(key)) continue;
      used.add(key);
      result.push({ ...candidate, pool: rule.pool });
      added += 1;
    }
  }

  return result.sort((a, b) => b.mixerScore - a.mixerScore);
}
