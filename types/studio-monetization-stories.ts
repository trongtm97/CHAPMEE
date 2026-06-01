export type StudioMonetizationStoryFilter =
  | "all"
  | "published"
  | "draft"
  | "completed"
  | "hidden"
  | "full_access_on"
  | "full_access_off"
  | "has_paid_chapters"
  | "all_free"
  | "unconfigured"
  | "paid_on"
  | "paid_off"
  | "has_revenue"
  | "no_revenue"
  | "full_story_escrow"
  | "pending_admin_completion"
  | "admin_completion_confirmed";

export type StudioMonetizationStorySort =
  | "updated"
  | "revenue"
  | "reads"
  | "title"
  | "chapter_count"
  | "full_access_price"
  | "paid_first"
  | "unconfigured_first";

export type StudioMonetizationPageSize = 10 | 25 | 50 | 100;

export type StudioMonetizationGenreOption = {
  id: string;
  name: string;
};

export type StudioMonetizationStoriesQuery = {
  page: number;
  pageSize: StudioMonetizationPageSize;
  search: string;
  filter: StudioMonetizationStoryFilter;
  sort: StudioMonetizationStorySort;
  genreId?: string;
};

export type StudioMonetizationBulkScope =
  | "all"
  | "published"
  | "completed"
  | "selected";

export type StudioMonetizationBulkAction =
  | "enable_paid"
  | "disable_paid"
  | "set_coin_price"
  | "set_free_chapters"
  | "enable_full_access"
  | "disable_full_access"
  | "set_full_access_price"
  | "apply_auto_pricing"
  | "disable_chapter_paid"
  | "set_all_free"
  | "reset";

export type StudioMonetizationBulkResult = {
  ok: boolean;
  successCount: number;
  failedCount: number;
  skippedCount?: number;
  error?: string;
};

export type StudioMonetizationStoriesPageResult = {
  rows: import("@/types/studio-monetization").StudioStoryMonetizationRow[];
  totalCount: number;
  page: number;
  pageSize: StudioMonetizationPageSize;
  totalPages: number;
  error: string | null;
};
