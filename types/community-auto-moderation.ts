export type AutoModerationDecision =
  | "auto_approved"
  | "needs_review"
  | "auto_rejected"
  | "auto_hidden"
  | "rate_limited";

export type AutoModerationMode = "safe" | "balanced" | "relaxed";

export type ModerationKeywordAction = "block" | "review" | "allow";

export type ModerationReasonCode =
  | "trusted_user_auto_approved"
  | "verified_author_auto_approved"
  | "low_trust_needs_review"
  | "new_account_needs_review"
  | "blocked_keyword"
  | "review_keyword"
  | "external_link_needs_review"
  | "rate_limited"
  | "duplicate_content"
  | "active_strike"
  | "too_many_reports"
  | "too_short"
  | "too_long"
  | "spam_pattern"
  | "community_restricted"
  | "group_posting_locked"
  | "auto_moderation_disabled"
  | "insufficient_approved_posts"
  | "email_not_verified"
  | "rejected_posts_threshold"
  | "reports_threshold"
  | "external_link_blocked";

export type CommunityRateLimits = {
  new_user_posts_per_day: number;
  normal_posts_per_day: number;
  trusted_posts_per_day: number;
  comments_per_minute: number;
  polls_per_day: number;
  challenges_per_day: number;
  post_cooldown_seconds: number;
  external_link_posts_per_day: number;
};

export type CommunityAutoModerationSettings = {
  id: string;
  enabled: boolean;
  mode: AutoModerationMode;
  autoApproveMinTrustScore: number;
  trustedAuthorMinScore: number;
  prioritizeVerifiedAuthors: boolean;
  requireEmailVerified: boolean;
  requireNoActiveStrikes: boolean;
  maxRejectedPosts30d: number;
  maxValidReports30d: number;
  allowExternalLinksForTrusted: boolean;
  reviewExternalLinks: boolean;
  autoRejectBlockedKeywords: boolean;
  reviewNewAccounts: boolean;
  newAccountDays: number;
  minPostLength: number;
  maxPostLength: number;
  minApprovedPostsForAuto: number;
  rateLimits: CommunityRateLimits;
  allowedDomains: string[];
};

export type ModerationKeywordRule = {
  id: string;
  keyword: string;
  matchType: "contains" | "exact" | "starts_with";
  action: ModerationKeywordAction;
  category: string | null;
  severity: "low" | "medium" | "high";
  isActive: boolean;
  createdAt: string;
};

export type UserTrustScoreBreakdown = {
  score: number;
  tier: "high_risk" | "normal" | "trusted" | "very_trusted";
  factors: Array<{ key: string; label: string; delta: number }>;
  emailVerified: boolean;
  accountAgeDays: number;
  approvedPostCount: number;
  rejectedPostCount30d: number;
  validReportCount30d: number;
  activeStrikeCount: number;
  isVerifiedAuthor: boolean;
  communityTrusted: boolean;
  communityRestricted: boolean;
  monetizationApproved: boolean;
};

export type MatchedRule = {
  rule: string;
  detail?: string;
};

export type AutoModerationResult = {
  decision: AutoModerationDecision;
  postStatus: "approved" | "pending" | "rejected" | "hidden";
  reasonCodes: ModerationReasonCode[];
  matchedRules: MatchedRule[];
  trustScore: number;
  userMessage: string;
};

export type ModerationDecisionLogItem = {
  id: string;
  postId: string | null;
  userId: string;
  userLabel: string | null;
  decision: AutoModerationDecision;
  trustScore: number | null;
  reasonCodes: string[];
  matchedRules: MatchedRule[];
  finalStatus: string;
  overriddenBy: string | null;
  overriddenAt: string | null;
  createdAt: string;
};

export type AutoModerationDashboardStats = {
  autoApproved24h: number;
  needsReview24h: number;
  autoRejected24h: number;
  rateLimited24h: number;
  topReasons: Array<{ code: string; count: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
};

export type AutoModerationPageData = {
  settings: CommunityAutoModerationSettings;
  keywordRules: ModerationKeywordRule[];
  recentDecisions: ModerationDecisionLogItem[];
  stats: AutoModerationDashboardStats;
  error: string | null;
};
