import type { UserTrustScoreBreakdown } from "@/types/community-auto-moderation";

export type CommunityAdminTab =
  | "overview"
  | "posts"
  | "comments"
  | "polls"
  | "challenges"
  | "story_groups"
  | "author_groups"
  | "processed";

export type CommunityPostType =
  | "discussion"
  | "review"
  | "poll_placeholder"
  | "challenge";

export type CommunityPostStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export type CommunityRiskLevel = "low" | "medium" | "high";

export type CommunityRejectReasonCode =
  | "spam"
  | "wrong_group"
  | "provocative"
  | "profanity"
  | "external_link"
  | "spoiler"
  | "policy"
  | "low_effort"
  | "other";

export type CommunityAdminPermissions = {
  canView: boolean;
  canModeratePosts: boolean;
  canModerateGroups: boolean;
  canManageSpamSettings: boolean;
};

export type CommunityAdminSummary = {
  pendingPosts: number;
  reportedComments: number;
  activePolls: number;
  activeChallenges: number;
  hotStoryGroups: number;
  reportedPosts: number;
  hiddenToday: number;
  processedToday: number;
};

export type CommunityQueueItem = {
  id: string;
  type: CommunityPostType;
  title: string;
  excerpt: string;
  authorName: string | null;
  authorUsername: string | null;
  authorRole: "reader" | "studio" | "admin" | null;
  authorUserId: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  episodeLabel: string | null;
  studioName: string | null;
  commentCount: number;
  reportCount: number;
  status: CommunityPostStatus;
  riskLevel: CommunityRiskLevel;
  createdAt: string;
  isPinned: boolean;
  isFeatured: boolean;
  commentsLocked: boolean;
  autoDecision: string | null;
  autoDecisionLabel: string | null;
  trustScore: number | null;
  autoReasonCodes: string[];
  matchedRules: Array<{ rule: string; detail?: string }>;
};

export type CommunityCommentItem = {
  id: string;
  body: string;
  authorName: string | null;
  authorUsername: string | null;
  postTitle: string | null;
  storyTitle: string | null;
  reportCount: number;
  status: string;
  createdAt: string;
};

export type CommunityPollItem = {
  id: string;
  title: string;
  storyTitle: string | null;
  status: string;
  reportCount: number;
  createdAt: string;
  source: "community_post" | "polls_table";
};

export type CommunityChallengeItem = {
  id: string;
  title: string;
  storyTitle: string | null;
  status: string;
  reportCount: number;
  createdAt: string;
  source: "community_post" | "creator_challenge";
};

export type CommunityStoryGroupItem = {
  storyId: string;
  storyTitle: string;
  storySlug: string;
  studioName: string | null;
  memberCount: number;
  postsLast24h: number;
  reportCount: number;
  status: string;
  postingLocked: boolean;
  hiddenFromRecommendation: boolean;
};

export type CommunityAuthorGroupItem = {
  creatorId: string;
  studioName: string;
  followerCount: number;
  postCount: number;
  reportCount: number;
  status: string;
  isVerified: boolean;
  postingLocked: boolean;
};

export type CommunityRecentlyHandledItem = {
  id: string;
  targetLabel: string;
  actionLabel: string;
  moderatorName: string | null;
  reasonCode: string | null;
  note: string | null;
  createdAt: string;
};

export type CommunitySpamSettings = {
  maxPostsPerDayNewUser: number;
  maxCommentsPerHour: number;
  preModerateExternalLinks: boolean;
  preModerateNewUsers: boolean;
  blockedKeywords: string[];
  reviewKeywords: string[];
  reportQueueThreshold: number;
  autoHideReportThreshold: number;
};

export type CommunityPostDetail = {
  item: CommunityQueueItem;
  content: string;
  publicUrl: string | null;
  likeCount: number;
  trust: UserTrustScoreBreakdown | null;
  autoDecision: string | null;
  autoReasonCodes: string[];
  matchedRules: Array<{ rule: string; detail?: string }>;
  riskSignals: {
    accountAgeDays: number | null;
    postsToday: number;
    priorReports: number;
    hasBlockedKeywords: boolean;
    hasExternalLink: boolean;
    possibleDuplicate: boolean;
  };
  previewComments: Array<{
    id: string;
    body: string;
    authorName: string | null;
    reportCount: number;
  }>;
};

export type CommunityAdminPageData = {
  summary: CommunityAdminSummary;
  queue: CommunityQueueItem[];
  comments: CommunityCommentItem[];
  polls: CommunityPollItem[];
  challenges: CommunityChallengeItem[];
  storyGroups: CommunityStoryGroupItem[];
  authorGroups: CommunityAuthorGroupItem[];
  recentlyHandled: CommunityRecentlyHandledItem[];
  spamSettings: CommunitySpamSettings;
  permissions: CommunityAdminPermissions;
  error: string | null;
};

export type CommunityPostActionKind =
  | "approve"
  | "reject"
  | "hide"
  | "restore"
  | "pin"
  | "unpin"
  | "feature"
  | "unfeature"
  | "lock_comments"
  | "unlock_comments";

export type CommunityPostActionInput = {
  postId: string;
  action: CommunityPostActionKind;
  reasonCode?: CommunityRejectReasonCode | null;
  note?: string;
  hiddenReason?: string;
  pinnedScope?: "group" | "story" | "author" | "global" | null;
  overrideReason?: string;
};
