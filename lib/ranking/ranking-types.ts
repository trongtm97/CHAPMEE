import type { RankingScoreBreakdown, RankingTimeWindow } from "@/types/ranking-board";

/** Official ranking period — mirrors board time windows. */
export type OriginRankingPeriod = RankingTimeWindow;

export type NormalizeMethod = "log1p" | "linear" | "percentile";

export type NormalizeMetricOptions = {
  method?: NormalizeMethod;
  /** Hard cap before normalization. */
  cap?: number;
  /** Reference max for log1p/linear scaling (maps to ~100 at this value). */
  maxReference?: number;
  /** Percentile position 0–1 when method = percentile. */
  percentileOf?: number;
};

export type AntiFraudFlags = {
  suspectedSelfViews?: boolean;
  suspectedBotTraffic?: boolean;
  abnormalRepeatSessions?: boolean;
  shortSessionSpam?: boolean;
  spamComments?: boolean;
  fakeSavesFollows?: boolean;
  paidManipulation?: boolean;
  reportViolation?: boolean;
  hiddenContent?: boolean;
  duplicateSourceConflict?: boolean;
  sourceProgressStale?: boolean;
  placeholderChapters?: boolean;
};

export type QualityFlags = {
  lowQualityReviews?: boolean;
  moderationFlagged?: boolean;
  permanentlyHidden?: boolean;
  policyBlocked?: boolean;
};

export type OriginalStoryRankingWeights = {
  validReads: number;
  continueRate: number;
  saveFollow: number;
  engagementQuality: number;
  recommendationVote: number;
  updateConsistency: number;
  newReaderGrowth: number;
  paidSupportCapped: number;
  freshness: number;
};

export type TranslatedStoryRankingWeights = {
  validReads: number;
  continueRate: number;
  updateReliability: number;
  saveFollow: number;
  translationQualityReview: number;
  engagementQuality: number;
  sourceProgress: number;
  freshness: number;
};

/** Raw + derived metrics for one story in a ranking period. */
export type OriginRankingMetricsBundle = {
  storyId: string;
  validReads: number;
  chapterStarts: number;
  chapterCompletes: number;
  nextChapterClicks: number;
  saves: number;
  follows: number;
  comments: number;
  reactions: number;
  reviews: number;
  boostPoints: number;
  tipsVnd: number;
  paidUnlocks: number;
  chaptersPublishedInPeriod: number;
  daysSinceLastChapter: number | null;
  newReaders: number;
  priorPeriodValidReads: number;
  avgReviewOverall: number | null;
  avgWritingStyle: number | null;
  reportRate: number;
  hideRate: number;
  hasSourceUrl: boolean;
  antiFraud: AntiFraudFlags;
  quality: QualityFlags;
};

export type OriginalStoryRankInput = {
  storyId: string;
  publishedAt: string | null;
  updatedAt: string | null;
  period: OriginRankingPeriod;
  metrics: OriginRankingMetricsBundle;
  weights?: Partial<OriginalStoryRankingWeights>;
};

export type TranslatedStoryRankInput = {
  storyId: string;
  publishedAt: string | null;
  updatedAt: string | null;
  period: OriginRankingPeriod;
  metrics: OriginRankingMetricsBundle;
  weights?: Partial<TranslatedStoryRankingWeights>;
};

export type OfficialRankComponentScores = {
  validReads: number;
  continueRate: number;
  saveFollow: number;
  engagementQuality: number;
  recommendationVote?: number;
  updateConsistency?: number;
  updateReliability?: number;
  newReaderGrowth?: number;
  paidSupportCapped?: number;
  translationQualityReview?: number;
  sourceProgress?: number;
  freshness: number;
};

export type OfficialRankScoreResult = {
  score: number;
  components: OfficialRankComponentScores;
  eligibilityPass: boolean;
  eligibilityReasons: string[];
  usedFallbackMetrics: boolean;
  breakdown: RankingScoreBreakdown;
};

export type OriginStoryEligibilityRow = {
  id: string;
  content_origin: string | null;
  status: string;
  visibility: string;
  moderation_status: string | null;
  quality_status: string | null;
  monetization_policy: string | null;
  must_be_free_to_read: boolean | null;
  can_sell_chapters: boolean | null;
  can_sell_story_bundle: boolean | null;
  source_url: string | null;
  authorUserId: string;
  authorActive?: boolean;
};
