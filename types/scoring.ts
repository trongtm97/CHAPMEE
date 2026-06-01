export const SCORING_ITEM_TYPES = ["story", "chapter", "reel"] as const;

export type ScoringItemType = (typeof SCORING_ITEM_TYPES)[number];

export type ScoringSurface =
  | "reels"
  | "discover"
  | "search"
  | "ranking";

export type MetricsWindow = "7d" | "30d";

export type ScoringItem = {
  itemType: ScoringItemType;
  itemId: string;
  storyId: string | null;
  authorUserId: string;
  publishedAt: string | null;
  genreId?: string | null;
  tagIds?: string[];
  isCompleted?: boolean;
  episodeCount?: number;
  wordCount?: number | null;
};

export type ExposureStats = {
  windowDays: number;
  totalImpressions: number;
  authorImpressions: number;
  storyImpressions: number;
  itemImpressions: number;
  authorSharePercent: number;
  storySharePercent: number;
  itemSharePercent: number;
};

export type StoryMetricsAggregate = {
  impressions: number;
  storyOpens: number;
  chapterStarts: number;
  chapterCompletes: number;
  nextChapterClicks: number;
  saves: number;
  follows: number;
  hides: number;
  reports: number;
  paidUnlocks: number;
  tips: number;
  revenueCoin: number;
  completionRate: number;
  nextChapterRate: number;
  saveRate: number;
  reportRate: number;
  hideRate: number;
  clickThroughRate: number;
  source: "daily" | "events" | "default";
};

export type ReelMetricsAggregate = {
  impressions: number;
  opens: number;
  readMoreClicks: number;
  storyOpens: number;
  chapterStarts: number;
  chapterCompletesAfterReel: number;
  saves: number;
  follows: number;
  hides: number;
  reports: number;
  reelsToReadRate: number;
  completionAfterReelRate: number;
  source: "daily" | "events" | "default";
};

export type ScoreBreakdown = {
  qualityScore: number;
  personalFitScore: number | null;
  freshnessScore: number;
  discoveryScore: number;
  fairnessScore: number;
  safetyScore: number;
  spamPenalty: number;
  finalReelsScore: number;
  finalDiscoverScore: number;
  finalSearchBoostScore: number;
  finalRankingScore: number;
  debug: Record<string, unknown>;
};

export type ContentScoreSnapshotRow = {
  id: string;
  snapshot_at: string;
  item_type: ScoringItemType;
  item_id: string;
  story_id: string | null;
  author_user_id: string;
  quality_score: number;
  personal_fit_score: number | null;
  freshness_score: number;
  discovery_score: number;
  fairness_score: number;
  safety_score: number;
  spam_penalty: number;
  final_reels_score: number;
  final_discover_score: number;
  final_search_boost_score: number;
  final_ranking_score: number;
  metrics_window: string;
  debug_json: Record<string, unknown>;
  created_at: string;
};

export type GenerateSnapshotsResult = {
  storiesProcessed: number;
  reelsProcessed: number;
  chaptersProcessed: number;
  errors: string[];
};
