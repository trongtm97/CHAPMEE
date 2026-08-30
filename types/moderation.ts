export type StoryAgeRating =
  | "all_ages"
  | "teen_13"
  | "young_adult_16"
  | "mature_18";

export type SensitiveFlag =
  | "violence"
  | "horror"
  | "strong_language"
  | "sexual_themes"
  | "self_harm_theme"
  | "substance_use"
  | "abuse_theme";

export type ReportTargetType =
  | "story"
  | "chapter"
  | "comment"
  | "story_review"
  | "inline_comment"
  | "inline_comment_thread"
  | "community_post"
  | "community_group"
  | "user"
  | "creator";

export type ReportReasonCode =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "privacy_violation"
  | "sexual_content"
  | "violence_self_harm"
  | "copyright"
  | "impersonation_scam"
  | "wrong_age_rating"
  | "wrong_taxonomy_tag"
  | "missing_content_warning"
  | "illegal_content"
  | "other";

/** @deprecated Dùng ReportReasonCode */
export type ReportReason = ReportReasonCode;

export type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "resolved_action_taken"
  | "resolved_no_violation"
  | "rejected"
  | "rejected_abuse"
  | "reviewed"
  | "escalated";

export type ReportPriority = "low" | "normal" | "high" | "urgent";

export type PolicyArea =
  | "safety"
  | "harassment"
  | "hate_speech"
  | "privacy"
  | "sexual_content"
  | "violence"
  | "self_harm"
  | "copyright"
  | "spam"
  | "scam"
  | "monetization"
  | "age_rating"
  | "platform_integrity";

export type ViolationSeverity =
  | "warning"
  | "minor"
  | "moderate"
  | "severe"
  | "critical";

export type ModerationActionType =
  | "no_action"
  | "warn"
  | "remove_content"
  | "hide_content"
  | "age_restrict"
  | "restrict_commenting"
  | "restrict_posting"
  | "restrict_story_publishing"
  | "hold_monetization"
  | "hold_payout"
  | "suspend_account"
  | "ban_account";

export type RestrictionType =
  | "comment_block"
  | "post_block"
  | "story_publish_block"
  | "creator_monetization_hold"
  | "payout_hold"
  | "recommendation_limited"
  | "report_block"
  | "account_suspended"
  | "account_banned"
  | "message_block_24h"
  | "message_block_7d"
  | "message_block_30d"
  | "message_banned";

export type ReporterQualitySummary = {
  userId: string;
  trustScore: number;
  reportsSubmitted: number;
  reportsValid: number;
  reportsRejected: number;
  reportsAbuse: number;
  spamSuspected: boolean;
  accuracyPercent: number | null;
  displayName: string | null;
  username: string | null;
};

export type AppealStatus = "open" | "reviewing" | "accepted" | "rejected";

export type ModerationStatus = "approved" | "pending" | "flagged" | "hidden" | "rejected";

export type ReportRecord = {
  id: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  reasonDetail: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ModerationQueueItem = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reasonCode: ReportReasonCode;
  reportCount: number;
  preview: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  createdAt: string;
  moderationStatus: ModerationStatus | null;
};

export type ViolationRecord = {
  id: string;
  userId: string;
  targetType: string | null;
  targetId: string | null;
  policyArea: PolicyArea;
  severity: ViolationSeverity;
  actionTaken: string;
  strikeCount: number;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export type AccountStrikeRecord = {
  id: string;
  policyArea: string;
  points: number;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
};

export type AccountRestrictionRecord = {
  id: string;
  restrictionType: RestrictionType;
  reason: string | null;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
};

export type AccountStatusSummary = {
  accountOk: boolean;
  activeStrikes: AccountStrikeRecord[];
  activeRestrictions: AccountRestrictionRecord[];
  recentViolations: ViolationRecord[];
  warningsCount: number;
};

export type CreatorStatusSummary = {
  canPublishStories: boolean;
  monetizationHeld: boolean;
  payoutHeld: boolean;
  monetizationHoldEndsAt: string | null;
  payoutHoldEndsAt: string | null;
  recentViolations: ViolationRecord[];
  pendingReviewStories: number;
};
