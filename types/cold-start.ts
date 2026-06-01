export const COLD_START_ITEM_TYPES = ["story", "reel", "author"] as const;
export type ColdStartItemType = (typeof COLD_START_ITEM_TYPES)[number];

export const COLD_START_STATUSES = [
  "active",
  "qualified",
  "failed",
  "completed",
  "paused"
] as const;
export type ColdStartStatus = (typeof COLD_START_STATUSES)[number];

export type ColdStartQualificationMetrics = {
  impressions: number;
  completion_rate: number;
  next_chapter_rate: number;
  save_rate: number;
  report_rate: number;
  hide_rate: number;
  reels_to_read_rate?: number;
  evaluated_at?: string;
};

export type ColdStartTestRow = {
  id: string;
  item_type: ColdStartItemType;
  item_id: string;
  story_id: string | null;
  author_user_id: string;
  status: ColdStartStatus;
  target_impressions: number;
  delivered_impressions: number;
  started_at: string;
  ends_at: string | null;
  qualified_at: string | null;
  failed_at: string | null;
  qualification_metrics: ColdStartQualificationMetrics;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ColdStartAdminItem = {
  id: string;
  itemType: ColdStartItemType;
  itemId: string;
  title: string;
  authorDisplayName: string;
  authorUsername: string | null;
  targetImpressions: number;
  deliveredImpressions: number;
  completionRate: number;
  reportRate: number;
  hideRate: number;
  status: ColdStartStatus;
  startedAt: string;
  endsAt: string | null;
};

export type ColdStartDashboardData = {
  error: string | null;
  activeCount: number;
  qualifiedCount: number;
  failedCount: number;
  newAuthorsTesting: number;
  totalImpressionsDelivered: number;
  qualificationRate: number;
  items: ColdStartAdminItem[];
};

export type AuthorColdStartLimit = {
  allowed: boolean;
  dailyTestsUsed: number;
  dailyTestsMax: number;
  quotaMultiplier: number;
  reason: string | null;
};
