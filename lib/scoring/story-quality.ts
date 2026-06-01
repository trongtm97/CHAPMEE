import { clamp01 } from "@/lib/scoring/math";
import type { ScoringConfig } from "@/lib/scoring/config";
import type { StoryMetricsAggregate } from "@/types/scoring";

export function calculateStoryQualityScoreFromMetrics(
  metrics: StoryMetricsAggregate,
  config: ScoringConfig
) {
  const w = config.ranking;
  const followRate = metrics.impressions > 0 ? metrics.follows / metrics.impressions : 0;
  const unlockRate =
    metrics.impressions > 0 ? metrics.paidUnlocks / metrics.impressions : 0;

  const positive =
    metrics.completionRate * w.weightCompletion +
    metrics.nextChapterRate * w.weightNextChapter +
    metrics.saveRate * w.weightSave +
    followRate * w.weightFollow +
    unlockRate * w.weightUnlock;

  const reportPenalty = metrics.reportRate * w.reportPenaltyWeight;
  const hidePenalty = metrics.hideRate * w.hidePenaltyWeight;

  const raw = positive - reportPenalty - hidePenalty;

  return {
    score: clamp01(raw),
    debug: {
      completion_rate: metrics.completionRate,
      next_chapter_rate: metrics.nextChapterRate,
      save_rate: metrics.saveRate,
      follow_rate: followRate,
      unlock_rate: unlockRate,
      report_penalty: reportPenalty,
      hide_penalty: hidePenalty,
      metrics_source: metrics.source
    }
  };
}
