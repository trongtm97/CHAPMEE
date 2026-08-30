import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { clamp01 } from "@/lib/scoring/math";
import type { RankingScoreBreakdown } from "@/types/ranking-board";

export type RankingMetricInput = {
  completionRate: number;
  nextChapterRate: number;
  saveRate: number;
  followRate: number;
  unlockRate: number;
  freshness: number;
  fairness: number;
  reportRate: number;
  hideRate: number;
};

export async function loadRankingWeights() {
  const raw = await getAlgorithmConfig();
  const config = buildScoringConfig(raw);
  const num = (key: string, fallback: number) => {
    const v = raw[key];
    const parsed = typeof v === "number" ? v : Number(v);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    ...config.ranking,
    weightFreshness: num("ranking.weight.freshness", 0.05),
    weightFairness: num("ranking.weight.fairness", 0.05)
  };
}

export function computeRankingScore(
  input: RankingMetricInput,
  weights: {
    weightCompletion: number;
    weightNextChapter: number;
    weightSave: number;
    weightFollow: number;
    weightUnlock: number;
    weightFreshness: number;
    weightFairness: number;
    reportPenaltyWeight: number;
    hidePenaltyWeight: number;
  }
): { score: number; breakdown: RankingScoreBreakdown } {
  const completion = clamp01(input.completionRate);
  const nextChapter = clamp01(input.nextChapterRate);
  const save = clamp01(input.saveRate);
  const follow = clamp01(input.followRate);
  const unlock = clamp01(input.unlockRate);
  const freshness = clamp01(input.freshness);
  const fairness = clamp01(input.fairness);
  const reportPenalty = clamp01(input.reportRate) * weights.reportPenaltyWeight;
  const hidePenalty = clamp01(input.hideRate) * weights.hidePenaltyWeight;

  const raw =
    completion * weights.weightCompletion +
    nextChapter * weights.weightNextChapter +
    save * weights.weightSave +
    follow * weights.weightFollow +
    unlock * weights.weightUnlock +
    freshness * weights.weightFreshness +
    fairness * weights.weightFairness -
    reportPenalty -
    hidePenalty;

  return {
    score: Math.max(0, raw),
    breakdown: {
      completion_rate: completion,
      next_chapter_rate: nextChapter,
      save_rate: save,
      follow_rate: follow,
      unlock_rate: unlock,
      freshness,
      fairness,
      report_penalty: reportPenalty,
      hide_penalty: hidePenalty,
      raw_score: raw
    }
  };
}

export function freshnessFromPublishedAt(publishedAt: string | null | undefined) {
  if (!publishedAt) return 0.35;
  const days = (Date.now() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 3) return 0.95;
  if (days <= 14) return 0.75;
  if (days <= 45) return 0.55;
  if (days <= 120) return 0.4;
  return 0.25;
}

export function reasonFromBoard(
  boardType: string,
  breakdown: RankingScoreBreakdown
): RankingScoreBreakdown["reason"] {
  if (boardType === "new_stories") return "Truyện mới";
  if (boardType === "original_stories") return "Truyện sáng tác";
  if (boardType === "translation_stories") return "Truyện dịch";
  if (boardType === "new_authors") return "Tác giả mới";
  if (boardType === "rising_stories") return "Đang lên";
  if (boardType === "reels_read_through") return "Reels kéo đọc";
  if (boardType === "most_saved") return "Lưu nhiều";
  if (boardType === "long_tail_quality") return "Giữ chân tốt";
  if (boardType === "boosted_stories") return "Được đề cử";
  if (boardType === "chapter_next_rate" || breakdown.next_chapter_rate >= 0.55) {
    return "Đọc tiếp cao";
  }
  if (breakdown.save_rate >= 0.45) return "Lưu nhiều";
  return undefined;
}
