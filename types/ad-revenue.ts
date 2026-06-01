export type AdMonthlyStatsStatus = "estimate" | "locked" | "reconciled" | "adjusted";

export type AdRevenueEstimateSettings = {
  id: string;
  default_rpm_vnd: number;
  creator_pool_percent: number;
  reserve_percent: number;
  reserve_hold_days: number;
  min_payout_vnd: number;
  is_creator_ads_revenue_enabled: boolean;
  is_estimate_visible_to_creators: boolean;
  notes: string | null;
  updated_at: string;
};

export type AdRevenueEstimateSettingsInput = Partial<
  Omit<AdRevenueEstimateSettings, "id" | "updated_at">
>;

export type AdDailyAuthorStatRow = {
  id: string;
  stat_date: string;
  author_id: string;
  story_id: string | null;
  chapter_id: string | null;
  placement_key: string | null;
  surface: string | null;
  device: string | null;
  rendered_impressions: number;
  estimated_pageviews: number;
  estimated_reads: number;
  estimated_revenue_vnd: number;
  invalid_adjustment_vnd: number;
  net_estimated_revenue_vnd: number;
};

export type AdMonthlyAuthorStatRow = {
  id: string;
  month: string;
  author_id: string;
  rendered_impressions: number;
  estimated_pageviews: number;
  estimated_reads: number;
  estimated_gross_revenue_vnd: number;
  invalid_adjustment_vnd: number;
  reserve_hold_vnd: number;
  estimated_payable_vnd: number;
  status: AdMonthlyStatsStatus;
};

export type AdRevenueAdminFilters = {
  from?: string;
  to?: string;
  month?: string;
  authorId?: string;
  storyId?: string;
  placementKey?: string;
  surface?: string;
  device?: string;
};

export type AdRevenueAdminDashboard = {
  totalRenderedImpressions: number;
  estimatedGrossRevenueVnd: number;
  creatorPoolEstimateVnd: number;
  reserveHoldEstimateVnd: number;
  invalidAdjustmentVnd: number;
  topAuthors: Array<{
    authorId: string;
    displayName: string | null;
    username: string | null;
    renderedImpressions: number;
    estimatedGrossRevenueVnd: number;
    estimatedPayableVnd: number;
  }>;
  topStories: Array<{
    storyId: string;
    title: string | null;
    renderedImpressions: number;
    estimatedGrossRevenueVnd: number;
  }>;
};

export type CreatorAdRevenueEstimate = {
  months: Array<
    AdMonthlyAuthorStatRow & {
      creatorPoolEstimateVnd: number;
    }
  >;
  settings: Pick<
    AdRevenueEstimateSettings,
    "creator_pool_percent" | "reserve_percent" | "min_payout_vnd"
  >;
};
