import type { FeedCandidate, FeedSurface } from "@/types/feed-mixer";

export type FairDistributionSurface =
  | "reels"
  | "discover"
  | "search"
  | "catalog"
  | "taxonomy_page"
  | "ranking";

export type FairDistributionWeights = {
  quality: number;
  freshness: number;
  engagement: number;
  coldStart: number;
  diversity: number;
  taxonomyFairness: number;
  penalty: number;
};

export type FairDistributionCaps = {
  maxMainGenreSharePercentInFeed: number;
  minColdTaxonomySharePercent: number;
  boostUnderexposedTaxonomy: number;
  maxItemsPerAuthorPerPage: number;
  maxAuthorSharePerFeedPercent: number;
  reduceScoreIfAuthorOverexposed: number;
  maxRepeatsPerStoryInReels: number;
};

export type FairDistributionQualityRules = {
  hideLowQualityFromRecommendation: boolean;
  demoteUnresolvedTaxonomyFlags: boolean;
  excludeSevereTaxonomyFlags: boolean;
  demoteHighReportRate: boolean;
  taxonomyFlagDemotePenalty: number;
  presentationModeMinSharePercent: number;
};

export type FairDistributionColdStart = {
  newStoryBoostHours: number;
  newAuthorBoostDays: number;
  maxBoostUntilImpressions: number;
  newStoryInitialImpressions: number;
  newAuthorDailyMinImpressions: number;
};

export type FairDistributionConfig = {
  weights: FairDistributionWeights;
  caps: FairDistributionCaps;
  quality: FairDistributionQualityRules;
  coldStart: FairDistributionColdStart;
};

export type ScoreComponentBreakdown = {
  qualityScore: number;
  freshnessScore: number;
  engagementScore: number;
  coldStartScore: number;
  diversityScore: number;
  taxonomyFairnessScore: number;
  penaltyScore: number;
  finalScore: number;
  capsApplied: string[];
  reasons: string[];
};

export type ScoredFeedCandidate = FeedCandidate & {
  scoreBreakdown?: ScoreComponentBreakdown;
};

export type FairDistributionContext = {
  surface: FeedSurface;
  userId: string | null;
  sessionId?: string;
  seenStoryIds?: Set<string>;
  recentlySeenKeys?: Set<string>;
  requestId?: string;
  simulation?: boolean;
  limit?: number;
};

export type RecommendationExposureLogInput = {
  userId?: string | null;
  storyId: string;
  authorId?: string | null;
  surface: FairDistributionSurface;
  taxonomyTermIds?: string[];
  position?: number;
  score?: number;
  reasonJson?: ScoreComponentBreakdown | Record<string, unknown>;
  requestId?: string;
  simulation?: boolean;
};

export type SimulationResult = {
  surface: FairDistributionSurface;
  candidates: Array<{
    storyId: string;
    itemId: string;
    itemType: string;
    title?: string;
    authorUserId: string;
    genreName: string | null;
    finalScore: number;
    breakdown: ScoreComponentBreakdown;
  }>;
  diversitySummary: {
    uniqueAuthors: number;
    uniqueGenres: number;
    topAuthorSharePercent: number;
    topGenreSharePercent: number;
  };
};

export type ExplainRecommendationResult = {
  storyId: string;
  surface: FairDistributionSurface;
  breakdown: ScoreComponentBreakdown | null;
  exposure24h: number;
  exposure7d: number;
  taxonomyExposure: Array<{ termId: string; impressions7d: number }>;
  recentLogs: Array<{
    shownAt: string;
    surface: string;
    score: number | null;
    reasons: string[];
  }>;
};
