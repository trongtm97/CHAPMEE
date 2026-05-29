export type ContentReviewItemType = "story" | "episode" | "community_post" | "comment";

export type ContentReviewTab =
  | "all"
  | "story"
  | "episode"
  | "community"
  | "comment"
  | "processed";

export type ContentReviewStatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "hidden";

export type ContentReviewReasonCode =
  | "missing_required_fields"
  | "too_short"
  | "hard_to_read"
  | "wrong_category"
  | "duplicate"
  | "spam"
  | "policy_violation"
  | "other";

export type ContentReviewActionKind = "approve" | "reject" | "request_changes";

export type ContentReviewSummary = {
  pendingStories: number;
  pendingEpisodes: number;
  pendingCommunityPosts: number;
  reportedComments: number;
  processedToday: number;
  rejectedToday: number;
};

export type ContentReviewQueueItem = {
  id: string;
  type: ContentReviewItemType;
  title: string;
  excerpt: string | null;
  status: string;
  creatorName: string | null;
  creatorUsername: string | null;
  genreName: string | null;
  parentTitle: string | null;
  episodeNumber: number | null;
  storySlug: string | null;
  storyId: string | null;
  createdAt: string;
  coverUrl: string | null;
  wordCount: number | null;
  episodeCount: number | null;
  hasMonetization: boolean;
  riskFlags: string[];
};

export type ContentReviewAuthorStats = {
  publishedStories: number;
  rejectedCount: number;
  recentReports: number;
  creatorStatus: string | null;
  isVerified: boolean;
};

export type ContentReviewDetail = {
  item: ContentReviewQueueItem;
  hook: string | null;
  longDescription: string | null;
  contentPreview: string | null;
  visibility: string | null;
  tags: string[];
  author: ContentReviewAuthorStats;
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  publicPreviewUrl: string | null;
};

export type RecentlyReviewedItem = {
  id: string;
  targetType: string;
  targetId: string;
  title: string;
  action: string;
  actionLabel: string;
  moderatorName: string | null;
  createdAt: string;
  reasonCode: string | null;
  note: string | null;
};

export type ContentReviewPageData = {
  summary: ContentReviewSummary;
  queue: ContentReviewQueueItem[];
  recentlyReviewed: RecentlyReviewedItem[];
  error: string | null;
};
