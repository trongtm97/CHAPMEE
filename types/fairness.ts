export type FairnessExposureWindow = "24h" | "7d" | "30d";

export type ExposureShareBreakdown = {
  surface: string;
  window: FairnessExposureWindow;
  totalImpressions: number;
  authorImpressions: Map<string, number>;
  storyImpressions: Map<string, number>;
  top1PercentAuthorShare: number;
  top5PercentAuthorShare: number;
  top10PercentAuthorShare: number;
  top1PercentStoryShare: number;
  top10PercentStoryShare: number;
  giniAuthor: number | null;
  giniStory: number | null;
  newAuthorImpressionShare: number;
  underExposedImpressionShare: number;
  longTailImpressionShare: number;
  poolImpressionShares: Record<string, number>;
};

export type Exposure7dContext = {
  totalImpressions: number;
  authorImpressions: Map<string, number>;
  storyImpressions: Map<string, number>;
  authorSharePercent: Map<string, number>;
  storySharePercent: Map<string, number>;
};

export type FairnessAdjustmentType =
  | "author_cap_penalty"
  | "story_cap_penalty"
  | "under_exposed_boost"
  | "long_tail_boost"
  | "new_author_boost"
  | "safety_penalty";

export type FairnessAdjustmentLogInput = {
  itemType: string;
  itemId: string;
  storyId?: string | null;
  authorUserId?: string | null;
  surface: string;
  adjustmentType: FairnessAdjustmentType;
  oldScore: number;
  newScore: number;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type FairnessWarningLevel = "ok" | "warn" | "critical";

export type FairnessAlertThresholds = {
  top1AuthorPercent: number;
  top10StoryPercent: number;
  minNewAuthorPercent: number;
  minLongTailPercent: number;
  minNewAuthorSlotsPercent: number;
  minUnderExposedSlotsPercent: number;
  maxAuthorSharePerFeedPercent: number;
};
