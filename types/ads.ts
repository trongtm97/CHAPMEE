export type AdDevice = "all" | "mobile" | "desktop" | "tablet";

export type AdFormat =
  | "display"
  | "in_article"
  | "in_feed"
  | "anchor"
  | "multiplex"
  | "custom";

export type AdSizeMode = "responsive" | "fixed" | "fluid";

export type AdSurface =
  | "reels"
  | "discover"
  | "story_detail"
  | "chapter_reader"
  | "search"
  | "ranking"
  | "community"
  | "content_hub"
  | "profile"
  | "mobile_web"
  | "desktop_web";

export type AdPlacementPosition =
  | "top"
  | "mid_content"
  | "bottom"
  | "sidebar"
  | "between_items"
  | "after_section"
  | "before_comments";

export type AdAttributionMode = "page_owner_author" | "platform_only" | "mixed";

export type AdRevenueBucket =
  | "reader_ads"
  | "content_hub_ads"
  | "discovery_ads"
  | "reels_ads"
  | "platform_ads";

export type AdPlacementRiskLevel = "ok" | "warning" | "blocked";

export type AdRenderEventType =
  | "impression_attempt"
  | "rendered"
  | "blocked"
  | "clicked_estimate";

export type AdPlacementRow = {
  id: string;
  placement_key: string;
  name: string;
  description: string | null;
  surface: string;
  page_pattern: string | null;
  device: AdDevice;
  position: AdPlacementPosition;
  ad_format: AdFormat;
  size_mode: AdSizeMode;
  width: number | null;
  height: number | null;
  max_width: number | null;
  min_height: number | null;
  adsense_slot_id: string | null;
  adsense_client_id: string | null;
  is_enabled: boolean;
  is_test_mode: boolean;
  priority: number;
  max_per_page: number;
  min_content_gap: number;
  max_ads_per_chapter: number;
  min_paragraphs_before: number;
  min_paragraphs_after: number;
  min_distance_px: number;
  feed_cooldown_items: number | null;
  show_label: boolean;
  lazy_load: boolean;
  reserve_space: boolean;
  sticky_allowed: boolean;
  hide_for_vip: boolean;
  hide_for_owner: boolean;
  hide_on_sensitive_content: boolean;
  no_ads_respect: boolean;
  full_width_responsive: boolean;
  fallback_text: string | null;
  revenue_eligible: boolean;
  attribution_mode: AdAttributionMode;
  revenue_bucket: AdRevenueBucket;
  frequency_rule: Record<string, unknown>;
  excluded_routes: string[];
  allowed_roles: string[];
  notes: string | null;
  internal_note: string | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdPlacementListItem = AdPlacementRow & {
  stats_today?: AdPlacementDayStats | null;
  risk_level?: AdPlacementRiskLevel;
};

export type AdPlacementDayStats = {
  renders: number;
  impressions: number;
  clicks: number;
  estimated_revenue: number;
  ctr: number;
};

export type AdPlacementPublic = Pick<
  AdPlacementRow,
  | "id"
  | "placement_key"
  | "device"
  | "ad_format"
  | "size_mode"
  | "width"
  | "height"
  | "max_width"
  | "min_height"
  | "adsense_slot_id"
  | "adsense_client_id"
  | "is_enabled"
  | "is_test_mode"
  | "max_per_page"
  | "min_content_gap"
  | "min_paragraphs_before"
  | "min_paragraphs_after"
  | "max_ads_per_chapter"
  | "min_distance_px"
  | "show_label"
  | "lazy_load"
  | "reserve_space"
  | "hide_for_vip"
  | "hide_for_owner"
  | "hide_on_sensitive_content"
  | "no_ads_respect"
  | "full_width_responsive"
  | "fallback_text"
  | "frequency_rule"
  | "excluded_routes"
  | "allowed_roles"
>;

export type AdPlacementListFilters = {
  surface?: string;
  device?: AdDevice;
  enabled?: "all" | "yes" | "no";
  testMode?: "all" | "yes" | "no";
  mode?: "all" | "live" | "test";
  adFormat?: AdFormat;
  risk?: "all" | AdPlacementRiskLevel;
  search?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};

export type AdPlacementStats = {
  totalPlacements: number;
  enabledCount: number;
  testModeCount: number;
  renderedToday: number;
  impressionsToday: number;
  clicksToday: number;
  estimatedRevenueToday: number;
  warningPlacementCount: number;
  statsAvailable: boolean;
};

export type AdPlacementRevenuePrep = {
  monthEstimatedRevenueVnd: number;
  revenueEligibleCount: number;
  platformOnlyCount: number;
  authorAttributedCount: number;
  statsAvailable: boolean;
};

export type AdPlacementFormInput = {
  placement_key: string;
  name: string;
  description?: string | null;
  surface: string;
  page_pattern?: string | null;
  device: AdDevice;
  position: AdPlacementPosition;
  ad_format: AdFormat;
  size_mode: AdSizeMode;
  width?: number | null;
  height?: number | null;
  max_width?: number | null;
  min_height?: number | null;
  adsense_slot_id?: string | null;
  adsense_client_id?: string | null;
  is_enabled?: boolean;
  is_test_mode?: boolean;
  priority?: number;
  max_per_page?: number;
  min_content_gap?: number;
  max_ads_per_chapter?: number;
  min_paragraphs_before?: number;
  min_paragraphs_after?: number;
  min_distance_px?: number;
  feed_cooldown_items?: number | null;
  show_label?: boolean;
  lazy_load?: boolean;
  reserve_space?: boolean;
  sticky_allowed?: boolean;
  hide_for_vip?: boolean;
  hide_for_owner?: boolean;
  hide_on_sensitive_content?: boolean;
  no_ads_respect?: boolean;
  full_width_responsive?: boolean;
  fallback_text?: string | null;
  revenue_eligible?: boolean;
  attribution_mode?: AdAttributionMode;
  revenue_bucket?: AdRevenueBucket;
  frequency_rule?: Record<string, unknown>;
  excluded_routes?: string[];
  allowed_roles?: string[];
  notes?: string | null;
  internal_note?: string | null;
};

export const AD_SURFACE_OPTIONS: { value: AdSurface; label: string }[] = [
  { value: "chapter_reader", label: "Đọc chương" },
  { value: "story_detail", label: "Chi tiết truyện" },
  { value: "discover", label: "Khám phá" },
  { value: "ranking", label: "Bảng xếp hạng" },
  { value: "reels", label: "Reels" },
  { value: "content_hub", label: "Bài viết / Content hub" },
  { value: "search", label: "Tìm kiếm" },
  { value: "community", label: "Cộng đồng" },
  { value: "profile", label: "Hồ sơ công khai" }
];

export const AD_DEVICE_OPTIONS: { value: AdDevice; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" }
];

export const AD_POSITION_OPTIONS: { value: AdPlacementPosition; label: string }[] = [
  { value: "top", label: "Đầu trang / đầu nội dung" },
  { value: "mid_content", label: "Giữa nội dung" },
  { value: "bottom", label: "Cuối trang" },
  { value: "sidebar", label: "Sidebar" },
  { value: "between_items", label: "Giữa các mục (feed/reels)" },
  { value: "after_section", label: "Sau một cụm section" },
  { value: "before_comments", label: "Trước bình luận" }
];

export const AD_FORMAT_OPTIONS: { value: AdFormat; label: string }[] = [
  { value: "display", label: "Display" },
  { value: "in_article", label: "In-article" },
  { value: "in_feed", label: "In-feed" },
  { value: "anchor", label: "Anchor" },
  { value: "multiplex", label: "Multiplex" },
  { value: "custom", label: "Custom" }
];

export const AD_SIZE_MODE_OPTIONS: { value: AdSizeMode; label: string }[] = [
  { value: "responsive", label: "Responsive" },
  { value: "fixed", label: "Fixed" },
  { value: "fluid", label: "Fluid / Native" }
];

export const AD_ATTRIBUTION_OPTIONS: { value: AdAttributionMode; label: string }[] = [
  { value: "platform_only", label: "Chỉ nền tảng" },
  { value: "page_owner_author", label: "Thuộc tác giả trang" },
  { value: "mixed", label: "Hỗn hợp" }
];

export const AD_REVENUE_BUCKET_OPTIONS: { value: AdRevenueBucket; label: string }[] = [
  { value: "reader_ads", label: "Đọc truyện" },
  { value: "discovery_ads", label: "Khám phá / BXH" },
  { value: "content_hub_ads", label: "Bài viết" },
  { value: "reels_ads", label: "Reels" },
  { value: "platform_ads", label: "Nền tảng chung" }
];

export const AD_PLACEMENT_PRESET_SUGGESTIONS = [
  { key: "reader_top_mobile", name: "Đầu trang đọc chương mobile" },
  { key: "reader_mid_content_mobile", name: "Giữa nội dung chương mobile" },
  { key: "reader_bottom_mobile", name: "Cuối chương mobile" },
  { key: "desktop_reader_sidebar", name: "Sidebar đọc chương desktop" },
  { key: "content_hub_article_bottom", name: "Cuối bài viết/blog" },
  { key: "discover_between_sections_mobile", name: "Giữa feed Khám phá mobile" }
] as const;
