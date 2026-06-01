import { clamp01, safeRate } from "@/lib/scoring/math";
import type { ReelMetricsAggregate } from "@/types/scoring";

export function calculateReelQualityScoreFromMetrics(metrics: ReelMetricsAggregate) {
  const impressions = Math.max(metrics.impressions, 1);
  const storyOpenRate = safeRate(metrics.storyOpens + metrics.readMoreClicks, impressions, 0);
  const chapterStartRate = safeRate(metrics.chapterStarts, impressions, 0);
  const chapterCompleteRate = metrics.completionAfterReelRate;
  const saveOrFollowRate = safeRate(metrics.saves + metrics.follows, impressions, 0);
  const hideReportPenalty = safeRate(metrics.hides + metrics.reports, impressions, 0) * 0.5;

  const raw =
    storyOpenRate * 0.3 +
    chapterStartRate * 0.25 +
    chapterCompleteRate * 0.25 +
    saveOrFollowRate * 0.15 -
    hideReportPenalty;

  return {
    score: clamp01(raw),
    debug: {
      story_open_rate: storyOpenRate,
      chapter_start_rate: chapterStartRate,
      chapter_complete_after_reel_rate: chapterCompleteRate,
      save_or_follow_rate: saveOrFollowRate,
      hide_report_penalty: hideReportPenalty,
      metrics_source: metrics.source
    }
  };
}
