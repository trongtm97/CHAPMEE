export const CONTENT_QUALITY_STATUSES = [
  "good",
  "needs_attention",
  "low_quality_warning_1",
  "low_quality_warning_2",
  "low_quality_final_review",
  "permanently_hidden_low_quality",
  "appealed",
  "pending_quality_review",
  "restored"
] as const;

export type ContentQualityStatus = (typeof CONTENT_QUALITY_STATUSES)[number];

export const CONTENT_QUALITY_TARGET_TYPES = ["story", "chapter"] as const;

export type ContentQualityTargetType = (typeof CONTENT_QUALITY_TARGET_TYPES)[number];

export const CONTENT_QUALITY_REASON_CODES = [
  "low_user_rating",
  "high_early_drop_rate",
  "repeated_reports",
  "too_short_content",
  "duplicate_or_repetitive_content",
  "misleading_title",
  "poor_formatting",
  "incomplete_story",
  "policy_related_quality_issue",
  "moderator_confirmed_low_quality"
] as const;

export type ContentQualityReasonCode = (typeof CONTENT_QUALITY_REASON_CODES)[number];

export const CONTENT_QUALITY_ACTIONS = [
  "warning_only",
  "hidden_temporarily",
  "restored",
  "resubmitted",
  "permanently_hidden",
  "monetization_disabled",
  "set_free_due_to_quality",
  "coin_refund_confirmed",
  "paid_restored"
] as const;

export type ContentQualityActionTaken = (typeof CONTENT_QUALITY_ACTIONS)[number];

export type ContentQualitySignalSnapshot = {
  ratingAverage: number | null;
  ratingCount: number;
  lowRatingRatio: number | null;
  earlyDropRate: number | null;
  continueReadRate: number | null;
  validReportCount: number;
  trustedReportCount: number;
  completenessIssues: string[];
  thresholdsMet: boolean;
  requireModeratorConfirmation: boolean;
  calculatedAt: string;
};

export type ContentQualityConfig = {
  minRatingsForQualityAction: number;
  lowRatingThreshold: number;
  minReportsForReview: number;
  earlyDropThreshold: number;
  requireModeratorConfirmationForPenalty: boolean;
  minContentWordsStory: number;
  minContentWordsChapter: number;
};

export type ContentQualityListTab =
  | "all"
  | "needs_action"
  | "in_review"
  | "restored"
  | "permanently_hidden";

export type ContentQualityListItem = {
  id: string;
  targetType: ContentQualityTargetType;
  targetId: string;
  storyId: string;
  chapterId: string | null;
  title: string;
  subtitle: string | null;
  qualityStatus: ContentQualityStatus;
  attemptCount: number;
  primaryReasonCode: ContentQualityReasonCode | null;
  primaryReasonLabel: string | null;
  reasonCodes: ContentQualityReasonCode[];
  warnedAt: string;
  editHref: string;
  canResubmit: boolean;
  canAppeal: boolean;
  monetizationDisabled: boolean;
};

export type ContentQualityReviewRecord = {
  id: string;
  targetType: ContentQualityTargetType;
  targetId: string;
  storyId: string | null;
  chapterId: string | null;
  status: ContentQualityStatus;
  attemptNumber: number;
  reasonCodes: ContentQualityReasonCode[];
  signalSnapshot: ContentQualitySignalSnapshot | null;
  moderatorNote: string | null;
  authorNote: string | null;
  actionTaken: ContentQualityActionTaken | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentQualityMonetizationImpactSummary = {
  monetizationStatus: string;
  buyerCount: number;
  totalCoinCollected: number;
  totalCoinRefunded: number;
  creatorRevenueVnd: number;
  freeAccessSetAt: string | null;
  completedRefundBatchCount: number;
  authorNote: string | null;
};

export type ContentQualityDetail = ContentQualityListItem & {
  history: ContentQualityReviewRecord[];
  signalSnapshot: ContentQualitySignalSnapshot | null;
  moderatorNote: string | null;
  recommendedActions: string[];
  warningMessage: string | null;
  monetizationImpact?: ContentQualityMonetizationImpactSummary | null;
};
