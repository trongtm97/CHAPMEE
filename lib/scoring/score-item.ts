import type { SupabaseClient } from "@supabase/supabase-js";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig, type ScoringConfig } from "@/lib/scoring/config";
import { calculateDiscoveryScore as computeDiscoveryScore } from "@/lib/scoring/discovery";
import { calculateFairnessScore as computeFairnessScore } from "@/lib/scoring/fairness";
import { calculateFreshnessScore as computeFreshnessScore } from "@/lib/scoring/freshness";
import {
  calculateFinalDiscoverScore,
  calculateFinalRankingScore,
  calculateFinalReelsScore,
  calculateFinalSearchBoostScore,
  calculateFinalScoreForSurface as computeSurfaceFinalScore
} from "@/lib/scoring/final-score";
import {
  loadExposureStats,
  loadReelMetricsAggregate,
  loadStoryMetricsAggregate
} from "@/lib/scoring/metrics-loader";
import { calculatePersonalFitScoreFromProfile } from "@/lib/scoring/personal-fit";
import { calculateReelQualityScoreFromMetrics } from "@/lib/scoring/reel-quality";
import { calculateSafetyScore as computeSafetyScore } from "@/lib/scoring/safety";
import { calculateStoryQualityScoreFromMetrics } from "@/lib/scoring/story-quality";
import { clamp01 } from "@/lib/scoring/math";
import type {
  MetricsWindow,
  ScoreBreakdown,
  ScoringItem,
  ScoringItemType,
  ScoringSurface,
  StoryMetricsAggregate
} from "@/types/scoring";

async function resolveScoringConfig(
  configOverride?: ScoringConfig
): Promise<ScoringConfig> {
  if (configOverride) return configOverride;
  const raw = await getAlgorithmConfig();
  return buildScoringConfig(raw);
}

export async function calculateStoryQualityScore(
  supabase: SupabaseClient,
  storyId: string,
  window: MetricsWindow = "7d",
  configOverride?: ScoringConfig
) {
  const config = await resolveScoringConfig(configOverride);
  const metrics = await loadStoryMetricsAggregate(supabase, storyId, window);
  return calculateStoryQualityScoreFromMetrics(metrics, config);
}

export async function calculateReelQualityScore(
  supabase: SupabaseClient,
  reelId: string,
  window: MetricsWindow = "7d"
) {
  const metrics = await loadReelMetricsAggregate(supabase, reelId, window);
  return calculateReelQualityScoreFromMetrics(metrics);
}

export async function calculateFreshnessScore(
  item: ScoringItem,
  configOverride?: ScoringConfig
) {
  const config = await resolveScoringConfig(configOverride);
  return computeFreshnessScore(item, config);
}

export async function calculateDiscoveryScore(
  supabase: SupabaseClient,
  item: ScoringItem,
  qualityScore: number,
  configOverride?: ScoringConfig,
  authorMeta?: { storyCount?: number; authorImpressions7d?: number }
) {
  const config = await resolveScoringConfig(configOverride);
  const exposure = await loadExposureStats(supabase, {
    authorUserId: item.authorUserId,
    storyId: item.storyId,
    itemId: item.itemId,
    itemType: item.itemType
  });
  return computeDiscoveryScore(item, config, {
    qualityScore,
    exposure,
    authorStoryCount: authorMeta?.storyCount,
    authorImpressions7d: authorMeta?.authorImpressions7d
  });
}

export async function calculateFairnessScore(
  supabase: SupabaseClient,
  item: ScoringItem,
  qualityScore: number,
  configOverride?: ScoringConfig
) {
  const config = await resolveScoringConfig(configOverride);
  const exposure = await loadExposureStats(supabase, {
    authorUserId: item.authorUserId,
    storyId: item.storyId,
    itemId: item.itemId,
    itemType: item.itemType
  });
  return computeFairnessScore(config, { qualityScore, exposure });
}

export async function calculateSafetyScore(
  item: ScoringItem,
  metrics: StoryMetricsAggregate,
  configOverride?: ScoringConfig
) {
  const config = await resolveScoringConfig(configOverride);
  return computeSafetyScore(item, config, metrics);
}

export async function calculatePersonalFitScore(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  item: ScoringItem
) {
  if (!userId) {
    return { score: null, debug: { reason: "anonymous" } };
  }

  const { data: profile } = await supabase
    .from("user_interest_profiles")
    .select(
      "preferred_genres, preferred_tags, preferred_authors, preferred_story_lengths, negative_genres, negative_tags, hidden_authors"
    )
    .eq("user_id", userId)
    .maybeSingle();

  return calculatePersonalFitScoreFromProfile(item, profile);
}

export async function scoreContentItem(
  supabase: SupabaseClient,
  item: ScoringItem,
  options?: {
    window?: MetricsWindow;
    userId?: string | null;
    config?: ScoringConfig;
    authorStoryCount?: number;
  }
): Promise<ScoreBreakdown> {
  const window = options?.window ?? "7d";
  const config = await resolveScoringConfig(options?.config);

  let qualityScore = 0.35;
  let qualityDebug: Record<string, unknown> = {};
  let metricsForSafety: StoryMetricsAggregate;

  if (item.itemType === "reel") {
    const reelMetrics = await loadReelMetricsAggregate(supabase, item.itemId, window);
    const reelQ = calculateReelQualityScoreFromMetrics(reelMetrics);
    qualityScore = reelQ.score;
    qualityDebug = reelQ.debug;
    metricsForSafety = {
      impressions: reelMetrics.impressions,
      storyOpens: reelMetrics.storyOpens,
      chapterStarts: reelMetrics.chapterStarts,
      chapterCompletes: reelMetrics.chapterCompletesAfterReel,
      nextChapterClicks: 0,
      saves: reelMetrics.saves,
      follows: reelMetrics.follows,
      hides: reelMetrics.hides,
      reports: reelMetrics.reports,
      paidUnlocks: 0,
      tips: 0,
      revenueCoin: 0,
      completionRate: reelMetrics.completionAfterReelRate,
      nextChapterRate: 0,
      saveRate: 0,
      reportRate: 0,
      hideRate: 0,
      clickThroughRate: reelMetrics.reelsToReadRate,
      source: reelMetrics.source
    };
  } else {
    const storyId = item.itemType === "story" ? item.itemId : item.storyId;
    const storyMetrics = storyId
      ? await loadStoryMetricsAggregate(supabase, storyId, window)
      : await loadStoryMetricsAggregate(supabase, item.itemId, window);
    const storyQ = calculateStoryQualityScoreFromMetrics(storyMetrics, config);
    qualityScore = storyQ.score;
    qualityDebug = storyQ.debug;
    metricsForSafety = storyMetrics;
  }

  const freshness = computeFreshnessScore(item, config);
  const exposure = await loadExposureStats(supabase, {
    authorUserId: item.authorUserId,
    storyId: item.storyId,
    itemId: item.itemId,
    itemType: item.itemType
  });
  const discovery = computeDiscoveryScore(item, config, {
    qualityScore,
    exposure,
    authorStoryCount: options?.authorStoryCount
  });
  const fairness = computeFairnessScore(config, { qualityScore, exposure });
  const safety = computeSafetyScore(item, config, metricsForSafety);
  const personal = await calculatePersonalFitScore(supabase, options?.userId, item);

  const monetizationSignal = clamp01(
    metricsForSafety.paidUnlocks > 0
      ? metricsForSafety.paidUnlocks / Math.max(metricsForSafety.impressions, 1)
      : metricsForSafety.tips > 0
        ? 0.3
        : 0
  );

  const finalInput = {
    qualityScore,
    personalFitScore: personal.score,
    freshnessScore: freshness.score,
    discoveryScore: discovery.score,
    fairnessScore: fairness.score,
    safetyScore: safety.score,
    spamPenalty: safety.spamPenalty,
    isCompleted: item.isCompleted,
    monetizationSignal
  };

  const reels = calculateFinalReelsScore(config, finalInput);
  const discover = calculateFinalDiscoverScore(config, finalInput);
  const search = calculateFinalSearchBoostScore(config, finalInput);
  const ranking = calculateFinalRankingScore(config, finalInput);

  return {
    qualityScore,
    personalFitScore: personal.score,
    freshnessScore: freshness.score,
    discoveryScore: discovery.score,
    fairnessScore: fairness.score,
    safetyScore: safety.score,
    spamPenalty: safety.spamPenalty,
    finalReelsScore: reels.score,
    finalDiscoverScore: discover.score,
    finalSearchBoostScore: search.score,
    finalRankingScore: ranking.score,
    debug: {
      quality: qualityDebug,
      freshness: freshness.debug,
      discovery: discovery.debug,
      fairness: fairness.debug,
      safety: safety.debug,
      personal_fit: personal.debug,
      final: {
        reels: reels.debug,
        discover: discover.debug,
        search: search.debug,
        ranking: ranking.debug
      },
      window
    }
  };
}

export async function calculateFinalScoreForSurface(
  supabase: SupabaseClient,
  surface: ScoringSurface,
  userId: string | null | undefined,
  item: ScoringItem,
  options?: { window?: MetricsWindow; config?: ScoringConfig }
) {
  const breakdown = await scoreContentItem(supabase, item, {
    window: options?.window,
    userId,
    config: options?.config
  });
  const config = await resolveScoringConfig(options?.config);

  const result = computeSurfaceFinalScore(surface, config, {
    qualityScore: breakdown.qualityScore,
    personalFitScore: breakdown.personalFitScore,
    freshnessScore: breakdown.freshnessScore,
    discoveryScore: breakdown.discoveryScore,
    fairnessScore: breakdown.fairnessScore,
    safetyScore: breakdown.safetyScore,
    spamPenalty: breakdown.spamPenalty,
    isCompleted: item.isCompleted,
    monetizationSignal: clamp01(
      breakdown.debug.quality &&
        typeof breakdown.debug.quality === "object" &&
        "unlock_rate" in (breakdown.debug.quality as object)
        ? Number((breakdown.debug.quality as { unlock_rate?: number }).unlock_rate)
        : 0
    )
  });

  return { score: result.score, breakdown, debug: result.debug };
}
