import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import type { FairDistributionConfig } from "@/types/fair-distribution";

function num(config: Record<string, unknown>, key: string, fallback: number) {
  const value = config[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(config: Record<string, unknown>, key: string, fallback: boolean) {
  const value = config[key];
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function getAlgorithmSettings() {
  return getAlgorithmConfig();
}

export async function getFairDistributionConfig(): Promise<FairDistributionConfig> {
  const raw = await getAlgorithmConfig();
  const scoring = buildScoringConfig(raw);

  return {
    weights: {
      quality: num(raw, "fds.weight.quality", 0.25),
      freshness: num(raw, "fds.weight.freshness", 0.15),
      engagement: num(raw, "fds.weight.engagement", 0.2),
      coldStart: num(raw, "fds.weight.cold_start", 0.15),
      diversity: num(raw, "fds.weight.diversity", 0.1),
      taxonomyFairness: num(raw, "fds.weight.taxonomy_fairness", 0.1),
      penalty: num(raw, "fds.weight.penalty", 0.05)
    },
    caps: {
      maxMainGenreSharePercentInFeed: num(
        raw,
        "fairness.max_main_genre_share_percent_in_feed",
        35
      ),
      minColdTaxonomySharePercent: num(
        raw,
        "fairness.min_cold_taxonomy_share_percent",
        8
      ),
      boostUnderexposedTaxonomy: num(raw, "fairness.boost_underexposed_taxonomy", 0.18),
      maxItemsPerAuthorPerPage: num(raw, "fairness.max_items_per_author_per_page", 2),
      maxAuthorSharePerFeedPercent: num(
        raw,
        "fairness.max_author_share_per_feed_percent",
        25
      ),
      reduceScoreIfAuthorOverexposed: num(
        raw,
        "fairness.reduce_score_if_author_overexposed",
        0.25
      ),
      maxRepeatsPerStoryInReels: num(raw, "fairness.max_repeats_per_story_in_reels", 3)
    },
    quality: {
      hideLowQualityFromRecommendation: bool(
        raw,
        "quality.hide_low_quality_from_recommendation",
        true
      ),
      demoteUnresolvedTaxonomyFlags: bool(
        raw,
        "quality.demote_unresolved_taxonomy_flags",
        true
      ),
      excludeSevereTaxonomyFlags: bool(raw, "quality.exclude_severe_taxonomy_flags", false),
      demoteHighReportRate: bool(raw, "quality.demote_high_report_rate", true),
      taxonomyFlagDemotePenalty: num(raw, "quality.taxonomy_flag_demote_penalty", 0.25),
      presentationModeMinSharePercent: num(
        raw,
        "quality.presentation_mode_min_share_percent",
        5
      )
    },
    coldStart: {
      newStoryBoostHours: num(raw, "cold_start.new_story_boost_hours", 72),
      newAuthorBoostDays: num(raw, "cold_start.new_author_boost_days", 30),
      maxBoostUntilImpressions: num(raw, "cold_start.max_boost_until_impressions", 800),
      newStoryInitialImpressions: scoring.coldStart.newStoryInitialImpressions,
      newAuthorDailyMinImpressions: scoring.coldStart.newAuthorDailyMinImpressions
    }
  };
}

export { updateAlgorithmSetting as updateAlgorithmSettings } from "@/lib/algorithm/settings";
