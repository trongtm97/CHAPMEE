import { clamp01, safeRate } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { ExposureStats, ScoringItem } from "@/types/scoring";

export function calculateDiscoveryScore(
  item: ScoringItem,
  config: ScoringConfig,
  input: {
    qualityScore: number;
    exposure: ExposureStats;
    authorStoryCount?: number;
    authorImpressions7d?: number;
  }
) {
  const cold = config.coldStart;
  const fair = config.fairness;

  let impressionTarget = cold.newStoryInitialImpressions;
  if (item.itemType === "reel") {
    impressionTarget = cold.newReelInitialImpressions;
  } else if (item.itemType === "chapter") {
    impressionTarget = Math.round(cold.newStoryInitialImpressions * 0.6);
  }

  const itemImpressions = input.exposure.itemImpressions;
  const impressionGap = safeRate(
    impressionTarget - itemImpressions,
    impressionTarget,
    0
  );
  const newItemBoost = clamp01(impressionGap);

  const authorUnderExposed =
    (input.authorImpressions7d ?? input.exposure.authorImpressions) <
    cold.newAuthorDailyMinImpressions;
  const authorBoost = authorUnderExposed ? 0.25 : 0;

  const qualityExposureGap =
    input.qualityScore >= 0.45 && itemImpressions < impressionTarget * 0.5
      ? fair.underExposedBoost
      : 0;

  const longTailBoost =
    input.qualityScore >= 0.4 &&
    input.exposure.itemSharePercent < fair.minLongTailSlotsPercent
      ? fair.longTailQualityBoost * 0.5
      : 0;

  const newAuthorBoost =
    (input.authorStoryCount ?? 99) <= 2 ? config.discover.weightNewAuthor * 2 : 0;

  const raw =
    newItemBoost * 0.45 +
    authorBoost * 0.2 +
    qualityExposureGap * 0.2 +
    longTailBoost * 0.1 +
    newAuthorBoost * 0.05;

  return {
    score: clamp01(raw),
    debug: {
      impression_target: impressionTarget,
      item_impressions: itemImpressions,
      new_item_boost: newItemBoost,
      author_under_exposed: authorUnderExposed,
      quality_exposure_gap: qualityExposureGap,
      long_tail_boost: longTailBoost
    }
  };
}
