import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { calculateExactMatchScore, calculateTextRelevance, type SearchScoringFields } from "@/lib/search/relevance";

export type SearchScoreComponents = {
  textRelevance: number;
  exactMatchScore: number;
  qualityScore: number;
  freshnessScore: number;
  fairnessScore: number;
  safetyPenalty: number;
};

export function calculateSearchScore(
  components: SearchScoreComponents,
  weights?: {
    textRelevance: number;
    exactMatch: number;
    quality: number;
    freshness: number;
    fairness: number;
  }
) {
  const w = weights ?? {
    textRelevance: 0.45,
    exactMatch: 0.15,
    quality: 0.2,
    freshness: 0.1,
    fairness: 0.1
  };

  const raw =
    components.textRelevance * w.textRelevance +
    components.exactMatchScore * w.exactMatch +
    components.qualityScore * w.quality +
    components.freshnessScore * w.freshness +
    components.fairnessScore * w.fairness -
    components.safetyPenalty;

  return Math.max(0, Math.min(2, raw));
}

export async function resolveSearchWeights() {
  const config = buildScoringConfig(await getAlgorithmConfig());
  return {
    textRelevance: config.search.weightTextRelevance,
    exactMatch: config.search.weightExactMatch,
    quality: config.search.weightQuality,
    freshness: config.search.weightFreshness,
    fairness: config.search.weightFairness
  };
}

export function scoreSearchCandidate(
  query: string,
  item: SearchScoringFields,
  signals: {
    qualityScore?: number;
    freshnessScore?: number;
    fairnessScore?: number;
    safetyPenalty?: number;
  },
  weights: Awaited<ReturnType<typeof resolveSearchWeights>>
) {
  const textRelevance = calculateTextRelevance(query, item);
  const exactMatchScore = calculateExactMatchScore(query, item);
  const qualityScore = signals.qualityScore ?? 0.35;
  const freshnessScore = signals.freshnessScore ?? 0.35;
  const fairnessScore = signals.fairnessScore ?? 1;
  const safetyPenalty = signals.safetyPenalty ?? 0;

  const searchScore = calculateSearchScore(
    {
      textRelevance,
      exactMatchScore,
      qualityScore,
      freshnessScore,
      fairnessScore,
      safetyPenalty
    },
    weights
  );

  return {
    textRelevance,
    exactMatchScore,
    qualityScore,
    freshnessScore,
    fairnessScore,
    safetyPenalty,
    searchScore
  };
}
