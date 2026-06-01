import { clamp01 } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { ReelMetricsAggregate, ScoringItem, StoryMetricsAggregate } from "@/types/scoring";

export function calculateSafetyScore(
  _item: ScoringItem,
  config: ScoringConfig,
  metrics: StoryMetricsAggregate | ReelMetricsAggregate
) {
  const safety = config.safety;
  const impressions = Math.max(metrics.impressions, 1);
  const reports =
    "reports" in metrics ? metrics.reports : 0;
  const hides = metrics.hides ?? 0;

  const reportRate = reports / impressions;
  const hideRate = hides / impressions;

  let score = 1;
  if (reportRate >= safety.reportRateThreshold) {
    score -= safety.reportPenalty * Math.min(1, reportRate / safety.reportRateThreshold);
  }
  if (hideRate >= safety.hideRateThreshold) {
    score -= safety.hidePenalty * Math.min(1, hideRate / safety.hideRateThreshold);
  }

  const spamPenalty = clamp01(
    reportRate * 0.5 + hideRate * 0.3
  );

  return {
    score: clamp01(score),
    spamPenalty,
    debug: {
      report_rate: reportRate,
      hide_rate: hideRate,
      report_threshold: safety.reportRateThreshold,
      hide_threshold: safety.hideRateThreshold
    }
  };
}
