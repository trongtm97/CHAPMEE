export const EXPLANATION_TYPES = [
  "ranking",
  "fairness",
  "cold_start",
  "safety",
  "spam",
  "quality"
] as const;

export type ExplanationType = (typeof EXPLANATION_TYPES)[number];

export const EXPLANATION_VISIBILITIES = ["admin", "creator"] as const;
export type ExplanationVisibility = (typeof EXPLANATION_VISIBILITIES)[number];

export const EXPLANATION_SEVERITIES = ["info", "warning", "critical", "success"] as const;
export type ExplanationSeverity = (typeof EXPLANATION_SEVERITIES)[number];

export type AlgorithmExplanation = {
  explanationType: ExplanationType;
  visibility: ExplanationVisibility;
  title: string;
  message: string;
  severity: ExplanationSeverity;
  metadata?: Record<string, unknown>;
};

export type AlgorithmScoreBreakdown = {
  qualityScore: number;
  freshnessScore: number;
  discoveryScore: number;
  fairnessScore: number;
  safetyScore: number;
  spamPenalty: number;
  finalReelsScore: number;
  finalDiscoverScore: number;
  finalSearchBoostScore: number;
  finalRankingScore: number;
  snapshotAt: string | null;
};

export type AlgorithmExposureSummary = {
  impressions1d: number;
  impressions7d: number;
  impressions30d: number;
  bySurface: Record<string, number>;
  byPool: Record<string, number>;
};

export type AlgorithmActionSummary = {
  clicks: number;
  readStart: number;
  readComplete: number;
  nextChapter: number;
  saves: number;
  follows: number;
  reports: number;
  hides: number;
};

export type AlgorithmFairnessSummary = {
  authorSharePercent: number;
  storySharePercent: number;
  authorOverCap: boolean;
  storyOverCap: boolean;
  authorCapPercent: number;
  storyCapPercent: number;
  penaltyApplied: boolean;
  recentAdjustments: number;
};

export type AlgorithmColdStartSummary = {
  testId: string | null;
  status: string | null;
  targetImpressions: number;
  deliveredImpressions: number;
  qualificationMessage: string | null;
};

export type AlgorithmSafetySummary = {
  reportRate: number;
  hideRate: number;
  completionRate: number;
  nextChapterRate: number;
  policyWarning: boolean;
  spamWarning: boolean;
};

export type AlgorithmItemAuditData = {
  error: string | null;
  itemType: "story" | "reel" | "author";
  itemId: string;
  title: string;
  storyId: string | null;
  authorUserId: string;
  authorDisplayName: string | null;
  authorUsername: string | null;
  scores: AlgorithmScoreBreakdown;
  exposure: AlgorithmExposureSummary;
  actions: AlgorithmActionSummary;
  fairness: AlgorithmFairnessSummary;
  coldStart: AlgorithmColdStartSummary;
  safety: AlgorithmSafetySummary;
  adminExplanations: AlgorithmExplanation[];
  creatorExplanations: AlgorithmExplanation[];
  scoreHistory: Array<{ snapshotAt: string; finalDiscover: number; finalReels: number }>;
  adjustmentLogs: Array<{
    id: string;
    adjustmentType: string;
    surface: string;
    reason: string | null;
    oldScore: number;
    newScore: number;
    createdAt: string;
  }>;
};

export type CreatorAlgorithmInsight = {
  storyId: string;
  messages: AlgorithmExplanation[];
};
