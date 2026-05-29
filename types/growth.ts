export type GrowthRange = "today" | "7d" | "30d" | "all";

export type GrowthKpis = {
  newUsers: number;
  dau: number;
  wau: number;
  mau: number;
  sessions: number;
  swipeItemViews: number;
  storyViews: number;
  chapterOpens: number;
  chapterCompletions: number;
  readMoreClicks: number;
  likes: number;
  saves: number;
  follows: number;
  comments: number;
  shares: number;
  newStories: number;
  newChapters: number;
  activeAuthors: number;
  activeReaders: number;
};

export type GrowthFunnelStep = {
  key: string;
  label: string;
  value: number;
};

export type GrowthRates = {
  readMoreRate: number;
  chapterCompletionRate: number;
  commentRate: number;
  shareRate: number;
  followRate: number;
  onboardingCompletionRate: number;
  creatorPublishRate: number;
};

export type CreatorGrowthMetrics = {
  newAuthors: number;
  activeAuthors: number;
  storiesPublished: number;
  chaptersPublished: number;
  averageChaptersPerActiveAuthor: number;
  authorsWithComments: number;
  authorsReturningThisWeek: number;
};

export type TopStoryMetric = {
  storyId: string;
  storyTitle: string;
  storySlug: string;
  creatorName: string | null;
  value: number;
};

export type TopAuthorMetric = {
  authorId: string;
  penName: string;
  value: number;
};

export type ReferralMetrics = {
  referralLinkOpens: number;
  referralSignups: number;
  topReferrers: Array<{ referrerId: string; value: number }>;
  usersByUtmSource: Array<{ source: string; value: number }>;
  signupsByUtmCampaign: Array<{ campaign: string; value: number }>;
  activationsBySource: Array<{ source: string; value: number }>;
};

export type NotificationMetrics = {
  notificationsCreated: number;
  notificationsRead: number;
  notificationClicks: number;
  unreadTotal: number;
};

export type RevenueMetrics = {
  hasRevenueData: boolean;
  grossRevenue: number;
  netCreatorRevenue: number;
  paidReaders: number;
  payingConversion: number;
  topEarningAuthors: Array<{ authorId: string; penName: string; grossRevenue: number }>;
  topSupporters: Array<{ userId: string; displayName: string; totalSupported: number }>;
};

export type GrowthDashboardData = {
  range: GrowthRange;
  kpis: GrowthKpis;
  onboardingFunnel: GrowthFunnelStep[];
  swipeFunnel: GrowthFunnelStep[];
  creatorFunnel: GrowthFunnelStep[];
  rates: GrowthRates;
  creatorMetrics: CreatorGrowthMetrics;
  topStoriesByViews: TopStoryMetric[];
  topStoriesByReadMore: TopStoryMetric[];
  topStoriesByShares: TopStoryMetric[];
  topAuthorsByGrowth: TopAuthorMetric[];
  reportedContentCount: number;
  referral: ReferralMetrics;
  notifications: NotificationMetrics;
  revenue: RevenueMetrics;
  error: string | null;
};
