import { clamp01 } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { ScoringSurface } from "@/types/scoring";

type FinalInput = {
  qualityScore: number;
  personalFitScore: number | null;
  freshnessScore: number;
  discoveryScore: number;
  fairnessScore: number;
  safetyScore: number;
  spamPenalty: number;
  isCompleted?: boolean;
  monetizationSignal?: number;
};

function redistributeWeights(
  weights: Record<string, number>,
  nullKeys: string[]
) {
  const entries = Object.entries(weights);
  const nullWeight = nullKeys.reduce((s, key) => s + (weights[key] ?? 0), 0);
  const active = entries.filter(([key]) => !nullKeys.includes(key));
  const activeSum = active.reduce((s, [, w]) => s + w, 0);
  if (activeSum <= 0) return weights;

  const scale = (activeSum + nullWeight) / activeSum;
  return Object.fromEntries(active.map(([key, w]) => [key, w * scale]));
}

export function calculateFinalReelsScore(config: ScoringConfig, input: FinalInput) {
  const w = config.reels;
  let weights: Record<string, number> = {
    personalized: w.weightPersonalized,
    quality: w.weightTrendingQuality,
    discovery: w.weightNewUnderExposed,
    freshness: 0.1,
    fairness: 0.1
  };

  const nullKeys: string[] = [];
  const personal =
    input.personalFitScore != null ? input.personalFitScore : (nullKeys.push("personalized"), 0);
  if (input.personalFitScore == null) {
    weights = redistributeWeights(weights, nullKeys);
  }

  const raw =
    personal * weights.personalized +
    input.qualityScore * weights.quality +
    input.discoveryScore * weights.discovery +
    input.freshnessScore * weights.freshness +
    input.fairnessScore * weights.fairness;

  const adjusted = raw * input.safetyScore * input.fairnessScore - input.spamPenalty * 0.1;

  return {
    score: clamp01(adjusted),
    debug: { weights, personal_fit: input.personalFitScore, adjusted_raw: adjusted }
  };
}

export function calculateFinalDiscoverScore(config: ScoringConfig, input: FinalInput) {
  const w = config.discover;
  const personal = input.personalFitScore ?? 0.5;
  const growthQuality = clamp01(input.qualityScore * 0.7 + input.discoveryScore * 0.3);
  const completedBoost = input.isCompleted ? 1 : 0.55;
  const newAuthorBoost = input.discoveryScore >= 0.5 ? 1 : 0.6;
  const longTailBoost = input.fairnessScore > 1 ? clamp01((input.fairnessScore - 1) * 2) : 0.5;

  const raw =
    personal * w.weightPersonalized +
    input.freshnessScore * w.weightFresh +
    growthQuality * w.weightGrowing +
    completedBoost * w.weightCompletedStory +
    newAuthorBoost * w.weightNewAuthor +
    longTailBoost * w.weightLongTail;

  const adjusted = raw * input.safetyScore - input.spamPenalty * 0.08;

  return {
    score: clamp01(adjusted),
    debug: {
      growth_quality: growthQuality,
      completed_boost: completedBoost,
      new_author_boost: newAuthorBoost,
      long_tail_boost: longTailBoost
    }
  };
}

export function calculateFinalRankingScore(config: ScoringConfig, input: FinalInput) {
  const monetization = clamp01(input.monetizationSignal ?? 0);
  const safetyPenalty = 1 - input.safetyScore;

  const raw =
    input.qualityScore * 0.7 +
    input.freshnessScore * 0.1 +
    clamp01((input.fairnessScore - 0.5) / 0.8) * 0.1 +
    monetization * 0.1 -
    safetyPenalty * 0.15 -
    input.spamPenalty * 0.1;

  return { score: clamp01(raw), debug: { monetization_signal: monetization, safety_penalty: safetyPenalty } };
}

export function calculateFinalSearchBoostScore(config: ScoringConfig, input: FinalInput) {
  const w = config.search;
  const raw =
    input.qualityScore * w.weightQuality +
    input.freshnessScore * w.weightFreshness +
    clamp01((input.fairnessScore - 0.5) / 0.8) * w.weightFairness +
    input.safetyScore * w.weightFairness;

  return { score: clamp01(raw), debug: { weights: w } };
}

export function calculateFinalScoreForSurface(
  surface: ScoringSurface,
  config: ScoringConfig,
  input: FinalInput
) {
  switch (surface) {
    case "reels":
      return calculateFinalReelsScore(config, input);
    case "discover":
      return calculateFinalDiscoverScore(config, input);
    case "ranking":
      return calculateFinalRankingScore(config, input);
    case "search":
      return calculateFinalSearchBoostScore(config, input);
    default:
      return { score: input.qualityScore, debug: {} };
  }
}
