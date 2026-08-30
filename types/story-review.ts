export type StoryReviewStatus = "visible" | "pending" | "hidden" | "deleted";

export type StoryReviewSort = "newest" | "highest" | "lowest" | "helpful";

export type StoryReviewInput = {
  overallRating: number;
  plotScore: number;
  characterScore: number;
  writingStyleScore: number;
  worldbuildingScore: number;
  title?: string | null;
  body?: string | null;
};

export type StoryReviewStatsView = {
  storyId: string;
  reviewCount: number;
  avgOverall: number | null;
  avgPlot: number | null;
  avgCharacter: number | null;
  avgWritingStyle: number | null;
  avgWorldbuilding: number | null;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  updatedAt: string | null;
};

export type StoryReviewView = {
  id: string;
  storyId: string;
  overallRating: number;
  plotScore: number;
  characterScore: number;
  writingStyleScore: number;
  worldbuildingScore: number;
  title: string | null;
  body: string | null;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  reviewerDisplayName: string | null;
  reviewerUsername: string | null;
  isOwnReview: boolean;
  userMarkedHelpful: boolean;
};

export type StoryReviewsPageResult = {
  reviews: StoryReviewView[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  sort: StoryReviewSort;
};

export type UpsertStoryReviewResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  review: StoryReviewView | null;
};

export type AdminStoryReviewRow = {
  id: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  reviewerProfileId: string;
  displayName: string | null;
  username: string | null;
  overallRating: number;
  plotScore: number;
  characterScore: number;
  writingStyleScore: number;
  worldbuildingScore: number;
  title: string | null;
  body: string | null;
  status: string;
  reportCount: number;
  helpfulCount: number;
  createdAt: string;
};
