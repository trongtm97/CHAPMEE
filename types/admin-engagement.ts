export type EngagementOverviewStats = {
  reactionsToday: number;
  reactions7d: number;
  reviewsPending: number;
  reviewsReported: number;
  inlineCommentsPending: number;
  inlineCommentsReported: number;
  inlineThreadsOrphaned: number;
  boostPointsToday: number;
  boostPoints7d: number;
  securityEventsToday: number;
  topBoostedStories: Array<{
    storyId: string;
    storyTitle: string;
    storySlug: string;
    totalBoostPoints: number;
  }>;
};

export type AdminPagedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
