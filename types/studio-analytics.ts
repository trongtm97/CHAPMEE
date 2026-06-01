export type StudioAnalyticsRange = "today" | "7d" | "30d" | "month" | "all";

export type StudioAnalyticsContentFilter =
  | "all"
  | "story"
  | "chapter"
  | "reels"
  | "comments";

export type StudioAnalyticsOverview = {
  reads: number;
  uniqueReaders: number;
  saves: number;
  comments: number;
  newFollows: number;
  reelsViews: number;
  reelsCtaClicks: number;
  reelsCtr: number | null;
  revenueVnd: number | null;
  hasMonetization: boolean;
  completedChapters: number;
  completionRate: number;
};

export type StudioStoryAnalytics = {
  id: string;
  title: string;
  slug: string;
  status: string;
  displayStatus: string;
  genreLabel: string | null;
  updatedAt: string;
  reads: number;
  saves: number;
  comments: number;
  newFollows: number;
  revenueVnd: number | null;
  studioHref: string;
  chaptersHref: string;
};

export type StudioChapterAnalytics = {
  id: string;
  storyId: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  reads: number;
  comments: number;
  completions: number;
  completionRate: number | null;
  publishedAt: string | null;
  editHref: string;
  openHref: string;
};

export type StudioReelsAnalytics = {
  id: string;
  hook: string;
  storyTitle: string;
  chapterLabel: string;
  views: number;
  ctaClicks: number;
  ctaRate: number | null;
  status: string;
  editHref: string;
};

export type StudioAnalyticsDelta = {
  value: number | null;
  label: string;
};

export type StudioAnalyticsTimelinePoint = {
  date: string;
  label: string;
  value: number;
};

export type StudioEngagementTimelinePoint = {
  date: string;
  label: string;
  saves: number;
  comments: number;
  follows: number;
};

export type StudioAnalyticsSourceBreakdown = {
  story: number;
  chapter: number;
  reels: number;
  community: number;
  hasTracking: boolean;
};

export type StudioAnalyticsInsight = {
  id: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  tone?: "info" | "warning" | "success";
};

export type StudioAnalyticsCommunitySummary = {
  newComments: number;
  unreplied: number;
  reported: number;
  topStories: Array<{
    storyId: string;
    title: string;
    count: number;
    href: string;
  }>;
};

export type StudioContentHealthIssue = {
  id: string;
  title: string;
  description: string;
  count: number;
  priority: "high" | "medium" | "low";
  ctaLabel: string;
  ctaHref: string;
};

export type StudioAnalyticsStoryOption = {
  id: string;
  title: string;
};

export type StudioReelsPeriodSummary = {
  publishedCount: number;
  totalViews: number;
  ctaClicks: number;
};

export type StudioAnalyticsPageData = {
  activeRange: StudioAnalyticsRange;
  activeContent: StudioAnalyticsContentFilter;
  activeStoryId?: string;
  search: string;
  updatedAt: string;
  overview: StudioAnalyticsOverview;
  overviewDeltas: Record<string, StudioAnalyticsDelta>;
  readTimeline: StudioAnalyticsTimelinePoint[];
  engagementTimeline: StudioEngagementTimelinePoint[];
  sourceBreakdown: StudioAnalyticsSourceBreakdown;
  insights: StudioAnalyticsInsight[];
  community: StudioAnalyticsCommunitySummary;
  healthIssues: StudioContentHealthIssue[];
  healthIssuesTotal: number;
  reelsSummary: StudioReelsPeriodSummary;
  stories: StudioStoryAnalytics[];
  chapters: StudioChapterAnalytics[];
  reels: StudioReelsAnalytics[];
  storyOptions: StudioAnalyticsStoryOption[];
  hasAnyData: boolean;
  error: string | null;
};

/** @deprecated Use StudioAnalyticsPageData */
export type StudioAnalyticsData = StudioAnalyticsPageData;
