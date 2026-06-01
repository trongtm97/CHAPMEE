import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";

export type ColdStartConfig = {
  newStoryInitialImpressions: number;
  newReelInitialImpressions: number;
  newAuthorDailyMinImpressions: number;
  minTestWindowHours: number;
  maxTestWindowHours: number;
  minImpressionsBeforeEval: number;
  maxTestsPerAuthorPerDay: number;
  completionRateQualifyThreshold: number;
  nextChapterRateQualifyThreshold: number;
  reportRateThreshold: number;
  hideRateThreshold: number;
  discoverPoolWeight: number;
  reelsPoolWeight: number;
};

export async function loadColdStartConfig(): Promise<ColdStartConfig> {
  const raw = await getAlgorithmConfig();
  const scoring = buildScoringConfig(raw);
  const num = (key: string, fallback: number) => {
    const v = raw[key];
    const parsed = typeof v === "number" ? v : Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    newStoryInitialImpressions: scoring.coldStart.newStoryInitialImpressions,
    newReelInitialImpressions: scoring.coldStart.newReelInitialImpressions,
    newAuthorDailyMinImpressions: scoring.coldStart.newAuthorDailyMinImpressions,
    minTestWindowHours: scoring.coldStart.minTestWindowHours,
    maxTestWindowHours: scoring.coldStart.maxTestWindowHours,
    minImpressionsBeforeEval: num("cold_start.min_impressions_before_eval", 50),
    maxTestsPerAuthorPerDay: num("cold_start.max_tests_per_author_per_day", 8),
    completionRateQualifyThreshold: num(
      "cold_start.completion_rate_qualify_threshold",
      0.35
    ),
    nextChapterRateQualifyThreshold: num(
      "cold_start.next_chapter_rate_qualify_threshold",
      0.25
    ),
    reportRateThreshold: scoring.safety.reportRateThreshold,
    hideRateThreshold: scoring.safety.hideRateThreshold,
    discoverPoolWeight: num("cold_start.discover_pool_weight", 0.12),
    reelsPoolWeight: num("cold_start.reels_pool_weight", 0.15)
  };
}

export function coldStartEndsAt(startedAt: string, maxHours: number) {
  const ends = new Date(startedAt);
  ends.setHours(ends.getHours() + maxHours);
  return ends.toISOString();
}
