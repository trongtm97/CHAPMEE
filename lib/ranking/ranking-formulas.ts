import { clamp01 } from "@/lib/scoring/math";
import { activityIso, periodFreshnessMultiplier } from "@/lib/ranking/ranking-period";
import type {
  AntiFraudFlags,
  NormalizeMetricOptions,
  OfficialRankComponentScores,
  OfficialRankScoreResult,
  OriginRankingMetricsBundle,
  OriginRankingPeriod,
  OriginalStoryRankInput,
  OriginalStoryRankingWeights,
  OriginStoryEligibilityRow,
  QualityFlags,
  TranslatedStoryRankInput,
  TranslatedStoryRankingWeights
} from "@/lib/ranking/ranking-types";
import type { RankingScoreBreakdown } from "@/types/ranking-board";

/** Official default weights — Truyện sáng tác (sum = 1.0). */
export const DEFAULT_ORIGINAL_STORY_RANKING_WEIGHTS: OriginalStoryRankingWeights = {
  validReads: 0.25,
  continueRate: 0.18,
  saveFollow: 0.14,
  engagementQuality: 0.12,
  recommendationVote: 0.1,
  updateConsistency: 0.08,
  newReaderGrowth: 0.05,
  paidSupportCapped: 0.05,
  freshness: 0.03
};

/** Official default weights — Truyện dịch (sum = 1.0). No paid chapter/bundle score. */
export const DEFAULT_TRANSLATED_STORY_RANKING_WEIGHTS: TranslatedStoryRankingWeights = {
  validReads: 0.24,
  continueRate: 0.18,
  updateReliability: 0.16,
  saveFollow: 0.12,
  translationQualityReview: 0.12,
  engagementQuality: 0.08,
  sourceProgress: 0.06,
  freshness: 0.04
};

/** Hard cap on paid-support signal before normalization (original only). */
export const PAID_SUPPORT_RAW_CAP = 500_000;

/** Max boost points reference for normalization. */
export const BOOST_POINTS_REFERENCE = 500;

const REVIEW_SCALE = 5;

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function mergeWeights<T extends Record<string, number>>(defaults: T, overrides?: Partial<T>): T {
  if (!overrides) return defaults;
  return { ...defaults, ...overrides };
}

/** Normalize raw counts/rates to 0–100. */
export function normalizeMetric(value: number, options: NormalizeMetricOptions = {}): number {
  const method = options.method ?? "log1p";
  const capped = Math.min(Math.max(0, value), options.cap ?? Number.POSITIVE_INFINITY);

  if (method === "percentile") {
    return clampScore((options.percentileOf ?? 0) * 100);
  }

  const maxReference = Math.max(1, options.maxReference ?? 1000);

  if (method === "linear") {
    return clampScore((capped / maxReference) * 100);
  }

  return clampScore((Math.log1p(capped) / Math.log1p(maxReference)) * 100);
}

/** Moderate freshness boost — avoids old stories dominating forever. */
export function applyFreshnessDecay(
  baseFreshnessScore: number,
  publishedAt: string | null | undefined,
  updatedAt: string | null | undefined,
  period: OriginRankingPeriod
): number {
  const anchor = activityIso(publishedAt, updatedAt);
  if (!anchor) return clampScore(baseFreshnessScore * 0.6);

  const days = (Date.now() - new Date(anchor).getTime()) / (24 * 60 * 60 * 1000);
  let decay = 1;

  if (days <= 3) decay = 1;
  else if (days <= 14) decay = 0.88;
  else if (days <= 45) decay = 0.72;
  else if (days <= 120) decay = 0.55;
  else if (days <= 365) decay = 0.38;
  else decay = 0.22;

  const recentUpdateBonus =
    updatedAt && days <= 30
      ? Math.min(12, (30 - Math.min(days, 30)) * 0.35)
      : 0;

  return clampScore(
    (baseFreshnessScore * decay + recentUpdateBonus) * periodFreshnessMultiplier(period)
  );
}

export function applyAntiFraudPenalty(score: number, flags: AntiFraudFlags): number {
  let penalty = 0;
  if (flags.suspectedSelfViews) penalty += 18;
  if (flags.suspectedBotTraffic) penalty += 25;
  if (flags.abnormalRepeatSessions) penalty += 12;
  if (flags.shortSessionSpam) penalty += 10;
  if (flags.spamComments) penalty += 8;
  if (flags.fakeSavesFollows) penalty += 15;
  if (flags.paidManipulation) penalty += 20;
  if (flags.reportViolation) penalty += 22;
  if (flags.hiddenContent) penalty += 100;
  if (flags.duplicateSourceConflict) penalty += 30;
  if (flags.sourceProgressStale) penalty += 12;
  if (flags.placeholderChapters) penalty += 10;
  return clampScore(score - penalty);
}

export function applyQualityPenalty(score: number, flags: QualityFlags): number {
  let penalty = 0;
  if (flags.lowQualityReviews) penalty += 6;
  if (flags.moderationFlagged) penalty += 35;
  if (flags.permanentlyHidden) penalty += 100;
  if (flags.policyBlocked) penalty += 100;
  return clampScore(score - penalty);
}

function safeRate(numerator: number, denominator: number) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function computeValidReadsScore(metrics: OriginRankingMetricsBundle): number {
  const validReads = Math.max(
    metrics.validReads,
    metrics.chapterCompletes,
    Math.round(metrics.chapterStarts * 0.35)
  );
  return normalizeMetric(validReads, { method: "log1p", maxReference: 2500 });
}

function computeContinueRateScore(metrics: OriginRankingMetricsBundle): number {
  const rate = safeRate(metrics.nextChapterClicks, Math.max(metrics.chapterCompletes, 1));
  const fromMetrics = metrics.chapterCompletes > 0 ? rate : 0;
  return clampScore(fromMetrics * 100);
}

function computeSaveFollowScore(metrics: OriginRankingMetricsBundle): number {
  const saveScore = normalizeMetric(metrics.saves, { method: "log1p", maxReference: 400 });
  const followScore = normalizeMetric(metrics.follows, { method: "log1p", maxReference: 200 });
  return clampScore(saveScore * 0.62 + followScore * 0.38);
}

function computeEngagementQualityScore(metrics: OriginRankingMetricsBundle): number {
  const commentScore = normalizeMetric(metrics.comments, { method: "log1p", maxReference: 120 });
  const reactionScore = normalizeMetric(metrics.reactions, { method: "log1p", maxReference: 300 });
  const reportPenalty = clampScore(metrics.reportRate * 100 * 0.8 + metrics.hideRate * 100 * 0.5);
  const raw = commentScore * 0.45 + reactionScore * 0.35 + normalizeMetric(metrics.reviews, { maxReference: 40 }) * 0.2;
  return clampScore(raw - reportPenalty);
}

function computeRecommendationVoteScore(metrics: OriginRankingMetricsBundle): number {
  return normalizeMetric(metrics.boostPoints, {
    method: "log1p",
    maxReference: BOOST_POINTS_REFERENCE
  });
}

function computeUpdateConsistencyScore(metrics: OriginRankingMetricsBundle): number {
  const chapters = metrics.chaptersPublishedInPeriod;
  if (chapters <= 0) {
    if (metrics.daysSinceLastChapter != null && metrics.daysSinceLastChapter <= 14) return 55;
    if (metrics.daysSinceLastChapter != null && metrics.daysSinceLastChapter <= 45) return 35;
    return 15;
  }
  const cadence = normalizeMetric(chapters, { method: "log1p", maxReference: 12 });
  const gapPenalty =
    metrics.daysSinceLastChapter != null && metrics.daysSinceLastChapter > 21
      ? Math.min(35, (metrics.daysSinceLastChapter - 21) * 1.2)
      : 0;
  return clampScore(cadence - gapPenalty);
}

function computeUpdateReliabilityScore(metrics: OriginRankingMetricsBundle): number {
  const consistency = computeUpdateConsistencyScore(metrics);
  const gap = metrics.daysSinceLastChapter;
  if (gap == null) return clampScore(consistency * 0.7);
  if (gap > 90) return clampScore(consistency * 0.25 - 15);
  if (gap > 45) return clampScore(consistency * 0.55 - 8);
  if (gap > 21) return clampScore(consistency * 0.78);
  return clampScore(consistency);
}

function computeNewReaderGrowthScore(metrics: OriginRankingMetricsBundle): number {
  const current = Math.max(metrics.newReaders, metrics.validReads, metrics.chapterCompletes);
  const prior = Math.max(metrics.priorPeriodValidReads, 1);
  const growth = (current - prior) / prior;
  return normalizeMetric(Math.max(0, growth), { method: "log1p", maxReference: 2.5 });
}

function computePaidSupportScoreCapped(metrics: OriginRankingMetricsBundle): number {
  const raw = Math.min(
    metrics.tipsVnd + metrics.paidUnlocks * 500,
    PAID_SUPPORT_RAW_CAP
  );
  return normalizeMetric(raw, { method: "log1p", maxReference: 50_000 });
}

function computeTranslationQualityReviewScore(metrics: OriginRankingMetricsBundle): number {
  if (metrics.avgReviewOverall != null && metrics.avgReviewOverall > 0) {
    const overall = (metrics.avgReviewOverall / REVIEW_SCALE) * 100;
    const writing =
      metrics.avgWritingStyle != null && metrics.avgWritingStyle > 0
        ? (metrics.avgWritingStyle / REVIEW_SCALE) * 100
        : overall;
    return clampScore(overall * 0.55 + writing * 0.45);
  }
  if (metrics.reviews > 0) {
    return normalizeMetric(metrics.reviews, { method: "log1p", maxReference: 25 }) * 0.6;
  }
  return 0;
}

function computeSourceProgressScore(metrics: OriginRankingMetricsBundle): number {
  if (!metrics.hasSourceUrl) return 20;
  let score = 55;
  if (metrics.chaptersPublishedInPeriod > 0) score += 25;
  if (metrics.daysSinceLastChapter != null && metrics.daysSinceLastChapter <= 14) score += 15;
  if (metrics.antiFraud.sourceProgressStale) score -= 25;
  return clampScore(score);
}

function computeFreshnessComponent(
  publishedAt: string | null,
  updatedAt: string | null,
  period: OriginRankingPeriod,
  usedFallback: boolean
): number {
  const base = usedFallback ? 42 : 58;
  return applyFreshnessDecay(base, publishedAt, updatedAt, period);
}

function weightedSum(
  pairs: Array<{ value: number; weight: number }>
): number {
  let sum = 0;
  for (const { value, weight } of pairs) {
    sum += value * weight;
  }
  return clampScore(sum);
}

function mapToBreakdown(
  components: OfficialRankComponentScores,
  metrics: OriginRankingMetricsBundle
): RankingScoreBreakdown {
  return {
    completion_rate: clamp01(components.validReads / 100),
    next_chapter_rate: clamp01(components.continueRate / 100),
    save_rate: clamp01(components.saveFollow / 100),
    follow_rate: clamp01(metrics.follows > 0 ? components.saveFollow / 100 : 0),
    unlock_rate: 0,
    freshness: clamp01(components.freshness / 100),
    fairness: clamp01(1 - metrics.reportRate - metrics.hideRate * 0.5),
    report_penalty: clamp01(metrics.reportRate),
    hide_penalty: clamp01(metrics.hideRate),
    raw_score: clamp01(
      (components.validReads +
        components.continueRate +
        components.saveFollow +
        components.freshness) /
        400
    )
  };
}

function detectMissingMetrics(metrics: OriginRankingMetricsBundle): boolean {
  return (
    metrics.validReads <= 0 &&
    metrics.chapterCompletes <= 0 &&
    metrics.chapterStarts <= 0 &&
    metrics.saves <= 0 &&
    metrics.boostPoints <= 0
  );
}

function applyFallbackBoost(
  components: OfficialRankComponentScores,
  publishedAt: string | null,
  updatedAt: string | null,
  period: OriginRankingPeriod
): OfficialRankComponentScores {
  const freshness = computeFreshnessComponent(publishedAt, updatedAt, period, true);
  return {
    ...components,
    validReads: Math.max(components.validReads, freshness * 0.45),
    continueRate: Math.max(components.continueRate, freshness * 0.35),
    saveFollow: Math.max(components.saveFollow, freshness * 0.25),
    freshness
  };
}

export function isEligibleOriginalStory(row: OriginStoryEligibilityRow): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const origin = row.content_origin === "translation" ? "translation" : "original";
  if (origin !== "original") reasons.push("not_original");
  if (row.visibility !== "public") reasons.push("not_public");
  if (!["approved", "published"].includes(row.status)) reasons.push("not_published");
  if (row.moderation_status === "flagged" || row.moderation_status === "removed" || row.moderation_status === "hidden") {
    reasons.push("moderation_blocked");
  }
  if (row.quality_status === "permanently_hidden_low_quality") reasons.push("quality_hidden");
  if (!row.authorUserId) reasons.push("author_missing");
  if (row.authorActive === false) reasons.push("author_inactive");
  return { pass: reasons.length === 0, reasons };
}

export function isEligibleTranslatedStory(row: OriginStoryEligibilityRow): {
  pass: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (row.content_origin !== "translation") reasons.push("not_translation");
  if (row.visibility !== "public") reasons.push("not_public");
  if (!["approved", "published"].includes(row.status)) reasons.push("not_published");
  if (row.must_be_free_to_read === false) reasons.push("not_free_to_read");
  if (row.monetization_policy === "full") reasons.push("paid_monetization_policy");
  if (
    row.can_sell_chapters === true &&
    row.can_sell_story_bundle === true &&
    row.monetization_policy !== "free_only" &&
    row.monetization_policy !== "no_monetization"
  ) {
    reasons.push("paid_sales_enabled");
  }
  if (row.moderation_status === "flagged" || row.moderation_status === "removed" || row.moderation_status === "hidden") {
    reasons.push("moderation_blocked");
  }
  if (row.quality_status === "permanently_hidden_low_quality") reasons.push("quality_hidden");
  if (!row.authorUserId) reasons.push("author_missing");
  return { pass: reasons.length === 0, reasons };
}

export function calculateOriginalStoryRankScore(
  input: OriginalStoryRankInput
): OfficialRankScoreResult {
  const weights = mergeWeights(DEFAULT_ORIGINAL_STORY_RANKING_WEIGHTS, input.weights);
  const m = input.metrics;
  let usedFallbackMetrics = detectMissingMetrics(m);

  let components: OfficialRankComponentScores = {
    validReads: computeValidReadsScore(m),
    continueRate: computeContinueRateScore(m),
    saveFollow: computeSaveFollowScore(m),
    engagementQuality: computeEngagementQualityScore(m),
    recommendationVote: computeRecommendationVoteScore(m),
    updateConsistency: computeUpdateConsistencyScore(m),
    newReaderGrowth: computeNewReaderGrowthScore(m),
    paidSupportCapped: computePaidSupportScoreCapped(m),
    freshness: computeFreshnessComponent(input.publishedAt, input.updatedAt, input.period, false)
  };

  if (usedFallbackMetrics) {
    components = applyFallbackBoost(
      components,
      input.publishedAt,
      input.updatedAt,
      input.period
    );
  }

  let score = weightedSum([
    { value: components.validReads, weight: weights.validReads },
    { value: components.continueRate, weight: weights.continueRate },
    { value: components.saveFollow, weight: weights.saveFollow },
    { value: components.engagementQuality, weight: weights.engagementQuality },
    { value: components.recommendationVote ?? 0, weight: weights.recommendationVote },
    { value: components.updateConsistency ?? 0, weight: weights.updateConsistency },
    { value: components.newReaderGrowth ?? 0, weight: weights.newReaderGrowth },
    { value: components.paidSupportCapped ?? 0, weight: weights.paidSupportCapped },
    { value: components.freshness, weight: weights.freshness }
  ]);

  score = applyAntiFraudPenalty(score, m.antiFraud);
  score = applyQualityPenalty(score, m.quality);

  return {
    score,
    components,
    eligibilityPass: true,
    eligibilityReasons: [],
    usedFallbackMetrics,
    breakdown: mapToBreakdown(components, m)
  };
}

export function calculateTranslatedStoryRankScore(
  input: TranslatedStoryRankInput
): OfficialRankScoreResult {
  const weights = mergeWeights(DEFAULT_TRANSLATED_STORY_RANKING_WEIGHTS, input.weights);
  const m = input.metrics;
  let usedFallbackMetrics = detectMissingMetrics(m);

  let components: OfficialRankComponentScores = {
    validReads: computeValidReadsScore(m),
    continueRate: computeContinueRateScore(m),
    saveFollow: computeSaveFollowScore(m),
    engagementQuality: computeEngagementQualityScore(m),
    updateReliability: computeUpdateReliabilityScore(m),
    translationQualityReview: computeTranslationQualityReviewScore(m),
    sourceProgress: computeSourceProgressScore(m),
    freshness: computeFreshnessComponent(input.publishedAt, input.updatedAt, input.period, false)
  };

  if (usedFallbackMetrics) {
    components = applyFallbackBoost(
      components,
      input.publishedAt,
      input.updatedAt,
      input.period
    );
  }

  let score = weightedSum([
    { value: components.validReads, weight: weights.validReads },
    { value: components.continueRate, weight: weights.continueRate },
    { value: components.updateReliability ?? 0, weight: weights.updateReliability },
    { value: components.saveFollow, weight: weights.saveFollow },
    { value: components.translationQualityReview ?? 0, weight: weights.translationQualityReview },
    { value: components.engagementQuality, weight: weights.engagementQuality },
    { value: components.sourceProgress ?? 0, weight: weights.sourceProgress },
    { value: components.freshness, weight: weights.freshness }
  ]);

  score = applyAntiFraudPenalty(score, m.antiFraud);
  score = applyQualityPenalty(score, m.quality);

  return {
    score,
    components,
    eligibilityPass: true,
    eligibilityReasons: [],
    usedFallbackMetrics,
    breakdown: mapToBreakdown(components, m)
  };
}
