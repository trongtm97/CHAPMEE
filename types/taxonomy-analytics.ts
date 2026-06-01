export const TAXONOMY_ANALYTICS_SURFACES = [
  "all",
  "reels",
  "discover",
  "search",
  "catalog",
  "taxonomy_page",
  "profile",
  "community",
  "ranking",
  "other"
] as const;

export type TaxonomyAnalyticsSurface = (typeof TAXONOMY_ANALYTICS_SURFACES)[number];

export const TAXONOMY_SOURCE_SURFACES = [
  "reels",
  "discover",
  "search",
  "catalog",
  "taxonomy_page",
  "profile",
  "community"
] as const;

export type TaxonomySourceSurface = (typeof TAXONOMY_SOURCE_SURFACES)[number];

export type TaxonomyDailyMetricsRow = {
  id: string;
  date: string;
  term_id: string;
  type: string;
  surface: TaxonomyAnalyticsSurface;
  impressions: number;
  clicks: number;
  ctr: number;
  story_starts: number;
  chapter_completes: number;
  completion_rate: number;
  saves: number;
  purchases: number;
  revenue_coin: number;
  reports_wrong_tag: number;
  reports_missing_warning: number;
  taxonomy_page_views: number;
  filter_applies: number;
  unique_readers: number;
  active_stories: number;
  active_creators: number;
};

export type TaxonomyCreatorMetricsRow = {
  id: string;
  date: string;
  term_id: string;
  creator_id: string;
  published_stories: number;
  impressions: number;
  starts: number;
  completes: number;
  saves: number;
  purchases: number;
  revenue_coin: number;
  reports: number;
};

export type TaxonomyAnalyticsFilters = {
  from: string;
  to: string;
  type: string | null;
  termId: string | null;
  surface: TaxonomyAnalyticsSurface;
  mainGenreId: string | null;
  creatorId: string | null;
  monetizationType: string | null;
  completionMinStarts: number;
  completionMinImpressions: number;
  completionMinStories: number;
};

export type TaxonomyAnalyticsTermSummary = {
  termId: string;
  termName: string;
  termSlug: string;
  type: string;
  impressions: number;
  clicks: number;
  ctr: number;
  storyStarts: number;
  chapterCompletes: number;
  // Previous period (same length immediately before current range).
  storyStartsPrev: number | null;
  chapterCompletesPrev: number | null;
  completionRatePrev: number | null;
  storyStartsGrowthPct: number | null;
  completionRateGrowthPct: number | null;
  completionRate: number;
  // Derived / convenience metrics.
  saveRate: number | null;
  paidUnlocks: number;
  paidConversionRate: number | null;
  revenuePerStart: number | null;
  revenuePer1000Impressions: number | null;
  saves: number;
  purchases: number;
  revenueCoin: number;
  reportsWrongTag: number;
  reportsMissingWarning: number;
  taxonomyPageViews: number;
  filterApplies: number;
  activeStories: number;
  activeCreators: number;
  seoIndexable: boolean;
  landingUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type TaxonomyAnalyticsInsight = {
  id: string;
  kind:
    | "high_supply_low_demand"
    | "low_supply_high_demand"
    | "quality_concern"
    | "seo_opportunity"
    | "monetization_opportunity"
    | "creator_opportunity";
  termId: string;
  termName: string;
  termSlug: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "critical";
};

export type TaxonomySeoTopStory = {
  storyId: string;
  title: string;
  slug: string;
  clicks: number;
};

export type TaxonomySeoPageMetric = {
  termId: string;
  termName: string;
  termSlug: string;
  type: string;
  landingUrl: string;
  indexable: boolean;
  seoTitlePresent: boolean;
  seoDescriptionPresent: boolean;
  duplicateRisk: boolean;
  duplicateCount: number;
  pageViews: number;
  storyClicks: number;
  filterApplies: number;
  ctr: number;
  publishedStoryCount: number;
  lowContent: boolean;
  topStories: TaxonomySeoTopStory[];
};

export type TaxonomyCreatorContribution = {
  creatorId: string;
  creatorName: string;
  creatorHandle: string | null;
  termIds: string[];
  termLabels: string[];
  impressions: number;
  publishedStories: number;
  starts: number;
  completes: number;
  completionRate: number;
  concentrationShare: number | null;
  coverageTaxonomyCount: number;
  warning: boolean;
  revenueCoin: number;
  reports: number;
};

export type TaxonomySurfaceContribution = {
  surface: TaxonomyAnalyticsSurface;
  impressions: number;
  impressionsShare: number | null;
  clicks: number;
  storyStarts: number;
  ctr: number;
};

export type TaxonomyFairnessData = {
  topTaxonomyConcentration: Array<{
    termId: string;
    termName: string;
    impressions: number;
    share: number;
  }>;
  topCreatorConcentration: Array<{
    termId: string;
    termName: string;
    creatorId: string;
    creatorName: string;
    creatorHandle: string | null;
    impressions: number;
    share: number;
  }>;
  newStoryExposureRate: number | null;
  coldStartExposureRate: number | null;
  longTailStoryExposureRate: number | null;
  missingNewContentTaxonomies: number | null;
  topStoriesDominantCount: number | null;
};

export type TaxonomyRecommendedAction = {
  id: string;
  title: string;
  description: string;
  severity: "good" | "info" | "warning" | "danger";
  actionLabel?: string;
  actionHref?: string;
};

export type TaxonomyAnalyticsPageData = {
  filters: TaxonomyAnalyticsFilters;
  summary: {
    impressions: number;
    impressionsPrev: number | null;
    impressionsDeltaPct: number | null;
    clicks: number;
    clicksPrev: number | null;
    clicksDeltaPct: number | null;
    ctr: number;
    ctrPrev: number | null;
    ctrDeltaPct: number | null;
    storyStarts: number;
    storyStartsPrev: number | null;
    storyStartsDeltaPct: number | null;
    chapterCompletes: number;
    chapterCompletesPrev: number | null;
    completionRate: number;
    completionRatePrev: number | null;
    completionRateDeltaPct: number | null;
    saves: number;
    savesPrev: number | null;
    saveRate: number | null;
    saveRatePrev: number | null;
    saveRateDeltaPct: number | null;
    purchases: number;
    purchasesPrev: number | null;
    paidConversionRate: number | null;
    paidConversionRatePrev: number | null;
    paidConversionRateDeltaPct: number | null;
    revenueCoin: number;
    revenueCoinPrev: number | null;
    revenueCoinDeltaPct: number | null;
    revenuePerStart: number | null;
    revenuePerStartPrev: number | null;
    revenuePerStartDeltaPct: number | null;
    revenuePer1000Impressions: number | null;
    revenuePer1000ImpressionsPrev: number | null;
    revenuePer1000ImpressionsDeltaPct: number | null;
    reportsWrongTag: number;
    reportsWrongTagPrev: number | null;
    reportsWrongTagDeltaPct: number | null;
    reportsMissingWarning: number;
    reportsMissingWarningPrev: number | null;
    reportsMissingWarningDeltaPct: number | null;
    fastestGrowingTerm: { termId: string; termName: string; growthPct: number } | null;
  };
  topByReads: TaxonomyAnalyticsTermSummary[];
  topByCompletion: TaxonomyAnalyticsTermSummary[];
  topByRevenue: TaxonomyAnalyticsTermSummary[];
  highSupplyLowDemand: TaxonomyAnalyticsTermSummary[];
  lowSupplyHighRetention: TaxonomyAnalyticsTermSummary[];
  topReported: TaxonomyAnalyticsTermSummary[];
  seoPages: TaxonomySeoPageMetric[];
  surfaceContribution: TaxonomySurfaceContribution[];
  creatorContribution: TaxonomyCreatorContribution[];
  insights: TaxonomyAnalyticsInsight[];
  termOptions: Array<{ id: string; name: string; slug: string; type: string }>;
  creatorOptions: Array<{ id: string; name: string; handle: string | null }>;
  monetizationOptions: Array<{ slug: string; name: string }>;
  typeOptions: string[];
  fairness: TaxonomyFairnessData;
  recommendedActions: TaxonomyRecommendedAction[];
  error: string | null;
};
