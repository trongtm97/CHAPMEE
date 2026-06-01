import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { loadColdStartConfig } from "@/lib/cold-start/config";
import type { CandidatePoolId, FeedSurface, PoolWeights } from "@/types/feed-mixer";

export async function getAlgorithmVersion() {
  const config = await getAlgorithmConfig();
  const version = config["system.algorithm_version"];
  return typeof version === "string" ? version : "1.0.0";
}

export async function getPoolWeightsForSurface(surface: FeedSurface): Promise<PoolWeights> {
  const raw = await getAlgorithmConfig();
  const scoring = buildScoringConfig(raw);
  const coldStart = await loadColdStartConfig();

  if (surface === "reels") {
    return {
      personalized: scoring.reels.weightPersonalized,
      trending_quality: scoring.reels.weightTrendingQuality,
      under_exposed: scoring.reels.weightNewUnderExposed,
      followed_author: scoring.reels.weightFollowedAuthor,
      long_tail_quality: scoring.reels.weightLongTailQuality,
      cold_start: coldStart.reelsPoolWeight
    };
  }

  if (surface === "discover") {
    return {
      personalized: scoring.discover.weightPersonalized,
      fresh: scoring.discover.weightFresh,
      growing: scoring.discover.weightGrowing,
      completed_story: scoring.discover.weightCompletedStory,
      new_author: scoring.discover.weightNewAuthor,
      long_tail_quality: scoring.discover.weightLongTail,
      cold_start: coldStart.discoverPoolWeight
    };
  }

  return {
    trending_quality: 0.5,
    fresh: 0.3,
    long_tail_quality: 0.2
  };
}

export function normalizePoolWeights(weights: PoolWeights): PoolWeights {
  const entries = Object.entries(weights).filter(([, v]) => (v ?? 0) > 0) as [
    CandidatePoolId,
    number
  ][];
  const sum = entries.reduce((s, [, v]) => s + v, 0);
  if (sum <= 0) return weights;
  return Object.fromEntries(
    entries.map(([key, value]) => [key, Math.round((value / sum) * 1000) / 1000])
  ) as PoolWeights;
}
