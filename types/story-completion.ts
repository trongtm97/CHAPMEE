export type StoryAdminCompletionStatus =
  | "not_requested"
  | "pending_review"
  | "approved"
  | "rejected";

export type CreatorEarningReleaseStatus =
  | "available"
  | "locked_until_story_completion"
  | "released"
  | "refunded"
  | "cancelled";

export type StoryCompletionReviewSort =
  | "requested_desc"
  | "locked_revenue_desc"
  | "story_updated_desc";

export type StoryCompletionReviewFilterStatus =
  | "all"
  | "pending_review"
  | "approved"
  | "rejected";

export type StudioFullStoryEscrowStoryRow = {
  storyId: string;
  title: string;
  slug: string;
  publicCode: string;
  status: string;
  isCompleted: boolean;
  adminCompletionStatus: StoryAdminCompletionStatus;
  adminCompletionNote: string | null;
  authorCompletionRequestNote: string | null;
  lockedFullStoryRevenueVnd: number;
  chapterCount: number;
  lastChapterUpdatedAt: string | null;
  storyUpdatedAt: string;
  fullAccessEnabled: boolean;
};

export type AdminStoryCompletionReviewRow = {
  storyId: string;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  isCompleted: boolean;
  adminCompletionStatus: StoryAdminCompletionStatus;
  adminCompletionRequestedAt: string | null;
  adminCompletionReviewedAt: string | null;
  adminCompletionNote: string | null;
  authorCompletionRequestNote: string | null;
  authorUserId: string;
  authorDisplayName: string;
  authorHandle: string | null;
  chapterCount: number;
  lastChapterUpdatedAt: string | null;
  fullAccessEnabled: boolean;
  fullAccessPriceCoin: number | null;
  lockedFullStoryRevenueVnd: number;
};
