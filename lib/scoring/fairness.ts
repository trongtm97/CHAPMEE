import { clamp } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { ExposureStats } from "@/types/scoring";

export function calculateFairnessScore(
  config: ScoringConfig,
  input: {
    qualityScore: number;
    exposure: ExposureStats;
  }
) {
  const fair = config.fairness;
  let score = 1;

  const authorCap = fair.authorExposureCap7dPercent;
  const storyCap = fair.storyExposureCap7dPercent;

  if (input.exposure.totalImpressions > 0) {
    if (input.exposure.authorSharePercent > authorCap) {
      const over =
        (input.exposure.authorSharePercent - authorCap) / Math.max(authorCap, 1);
      score -= Math.min(0.4, over * fair.authorOverCapPenalty);
    }
    if (input.exposure.storySharePercent > storyCap) {
      const over =
        (input.exposure.storySharePercent - storyCap) / Math.max(storyCap, 1);
      score -= Math.min(0.35, over * fair.storyOverCapPenalty);
    }
  }

  const underExposed =
    input.exposure.itemImpressions <
    config.coldStart.newStoryInitialImpressions * 0.35;
  if (underExposed && input.qualityScore >= 0.45) {
    score += fair.underExposedBoost;
  }

  if (
    input.qualityScore >= 0.5 &&
    input.exposure.itemSharePercent < fair.minLongTailSlotsPercent
  ) {
    score += fair.longTailQualityBoost * 0.35;
  }

  return {
    score: clamp(score, 0.5, 1.3),
    debug: {
      author_share_percent: input.exposure.authorSharePercent,
      story_share_percent: input.exposure.storySharePercent,
      author_cap_percent: authorCap,
      story_cap_percent: storyCap,
      under_exposed: underExposed
    }
  };
}
