export const CONTENT_POST_TYPES = [
  "article",
  "guide",
  "seo",
  "editorial",
  "policy",
  "news"
] as const;

export type ContentPostType = (typeof CONTENT_POST_TYPES)[number];

export const CONTENT_POST_STATUSES = [
  "draft",
  "published",
  "scheduled",
  "hidden",
  "archived"
] as const;

export type ContentPostStatus = (typeof CONTENT_POST_STATUSES)[number];

export type ContentPostRobots = "index,follow" | "noindex,follow" | "noindex,nofollow";

export type ContentPostCategoryStatus = "active" | "hidden";

export type ContentPostCategory = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  status: ContentPostCategoryStatus;
  cover_image_url: string | null;
  cover_media_asset_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  indexable: boolean;
  robots: ContentPostRobots;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_image_media_asset_id: string | null;
  public_code: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateContentPostCategoryInput = {
  parent_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number;
  status?: ContentPostCategoryStatus;
  cover_image_url?: string | null;
  cover_media_asset_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  indexable?: boolean;
  robots?: ContentPostRobots;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  og_image_media_asset_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UpdateContentPostCategoryInput = Partial<CreateContentPostCategoryInput>;

export type AdminContentPost = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  /** @deprecated Legacy object key — prefer cover_media_asset_id. */
  cover_media_asset_id?: string | null;
  og_image_media_asset_id?: string | null;
  category: string | null;
  tags: string[];
  post_type: ContentPostType;
  status: ContentPostStatus;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  indexable: boolean;
  robots: ContentPostRobots;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  author_admin_id: string | null;
  updated_by: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  /** Resolved at read time — not persisted. */
  coverDisplayUrl?: string | null;
};

export type CreateContentPostInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  cover_media_asset_id?: string | null;
  og_image_media_asset_id?: string | null;
  category?: string | null;
  tags?: string[];
  post_type?: ContentPostType;
  status?: ContentPostStatus;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  indexable?: boolean;
  robots?: ContentPostRobots;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  author_admin_id?: string | null;
  updated_by?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  archived_at?: string | null;
};

export type UpdateContentPostInput = Partial<CreateContentPostInput>;

export const ANNOUNCEMENT_TYPES = [
  "general",
  "maintenance",
  "policy",
  "monetization",
  "creator",
  "reader",
  "feature",
  "warning"
] as const;

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export const ANNOUNCEMENT_VISIBILITIES = [
  "public",
  "targeted",
  "admin_only"
] as const;

export type AnnouncementVisibility = (typeof ANNOUNCEMENT_VISIBILITIES)[number];

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "published",
  "scheduled",
  "hidden",
  "archived"
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const ANNOUNCEMENT_PRIORITIES = [
  "low",
  "normal",
  "high",
  "critical"
] as const;

export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const ANNOUNCEMENT_AUDIENCE_TYPES = [
  "all",
  "creators",
  "readers",
  "monetized_creators",
  "published_creators",
  "custom"
] as const;

export type AnnouncementAudienceType = (typeof ANNOUNCEMENT_AUDIENCE_TYPES)[number];

export type PlatformAnnouncement = {
  id: string;
  title: string;
  slug: string;
  public_code: string | null;
  excerpt: string | null;
  body: string | null;
  announcement_type: AnnouncementType;
  visibility: AnnouncementVisibility;
  status: AnnouncementStatus;
  priority: AnnouncementPriority;
  audience_type: AnnouncementAudienceType;
  indexable: boolean;
  follow_links: boolean;
  seo_title: string | null;
  seo_description: string | null;
  canonical_path: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_image_media_asset_id?: string | null;
  published_at: string | null;
  scheduled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CreateAnnouncementInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  announcement_type?: AnnouncementType;
  visibility?: AnnouncementVisibility;
  status?: AnnouncementStatus;
  priority?: AnnouncementPriority;
  audience_type?: AnnouncementAudienceType;
  indexable?: boolean;
  follow_links?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_path?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  og_image_media_asset_id?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export const CAMPAIGN_NOTIFICATION_TYPES = [
  "system",
  "policy",
  "monetization",
  "account",
  "story",
  "chapter",
  "event",
  "warning",
  "marketing"
] as const;

export type CampaignNotificationType = (typeof CAMPAIGN_NOTIFICATION_TYPES)[number];

export const CAMPAIGN_TARGET_MODES = ["all", "segment", "manual"] as const;

export type CampaignTargetMode = (typeof CAMPAIGN_TARGET_MODES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "paused",
  "cancelled",
  "failed",
  "archived"
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_PRIORITIES = ["low", "normal", "high", "critical"] as const;

export type CampaignPriority = (typeof CAMPAIGN_PRIORITIES)[number];

export const CAMPAIGN_VISUAL_STYLES = [
  "default",
  "info",
  "success",
  "warning",
  "monetization",
  "creator",
  "reader"
] as const;

export type CampaignVisualStyle = (typeof CAMPAIGN_VISUAL_STYLES)[number];

export const CAMPAIGN_ACTION_TYPES = [
  "none",
  "page",
  "story",
  "chapter",
  "reels",
  "wallet",
  "studio",
  "verification",
  "announcement",
  "content_post",
  "community"
] as const;

export type CampaignActionType = (typeof CAMPAIGN_ACTION_TYPES)[number];

export const NOTIFICATION_TARGET_SEGMENTS = [
  "all_users",
  "readers",
  "creators",
  "creators_with_story",
  "creators_with_published_story",
  "monetization_enabled",
  "monetization_disabled",
  "verified_users",
  "unverified_users",
  "users_with_coin",
  "inactive_7_days",
  "inactive_30_days",
  "new_users_7_days",
  "vip_users",
  "staff"
] as const;

export type NotificationTargetSegment = (typeof NOTIFICATION_TARGET_SEGMENTS)[number];

export type NotificationCampaignDeliveryStats = {
  sent_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  open_rate: number;
  click_rate: number;
};

export type NotificationCampaignAuditLog = {
  id: string;
  campaign_id: string;
  actor_id: string | null;
  action: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type NotificationCampaign = {
  id: string;
  name: string | null;
  title: string;
  message: string;
  notification_type: CampaignNotificationType;
  priority: CampaignPriority;
  visual_style: CampaignVisualStyle;
  action_type: CampaignActionType;
  action_target_id: string | null;
  href: string | null;
  channel_in_app: boolean;
  channel_email: boolean;
  channel_banner: boolean;
  channel_popup: boolean;
  target_mode: CampaignTargetMode;
  target_segments: string[];
  manual_user_ids: string[];
  status: CampaignStatus;
  scheduled_at: string | null;
  expires_at: string | null;
  sent_at: string | null;
  estimated_recipient_count: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  delivery_stats?: NotificationCampaignDeliveryStats;
};

export type CreateNotificationCampaignInput = {
  name?: string | null;
  title: string;
  message: string;
  notification_type?: CampaignNotificationType;
  priority?: CampaignPriority;
  visual_style?: CampaignVisualStyle;
  action_type?: CampaignActionType;
  action_target_id?: string | null;
  href?: string | null;
  channel_in_app?: boolean;
  channel_email?: boolean;
  channel_banner?: boolean;
  channel_popup?: boolean;
  target_mode?: CampaignTargetMode;
  target_segments?: string[];
  manual_user_ids?: string[];
  status?: CampaignStatus;
  scheduled_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type UpdateNotificationCampaignInput = Partial<CreateNotificationCampaignInput> & {
  sent_at?: string | null;
  estimated_recipient_count?: number;
  archived_at?: string | null;
};

export type UserNotification = {
  id: string;
  user_id: string;
  campaign_id: string | null;
  title: string;
  message: string;
  notification_type: CampaignNotificationType;
  href: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export const CANONICAL_MODES = ["self", "custom", "parent", "none"] as const;

export type CanonicalMode = (typeof CANONICAL_MODES)[number];

export type SeoRule = {
  id: string;
  route_pattern: string;
  page_type: string;
  indexable: boolean;
  follow_links: boolean;
  include_sitemap: boolean;
  canonical_mode: CanonicalMode;
  custom_canonical_url: string | null;
  title_template: string | null;
  description_template: string | null;
  priority: number;
  change_frequency: string;
  is_active: boolean;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SeoAuditLog = {
  id: string;
  route: string;
  page_type: string | null;
  issue_type: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ListContentPostsOptions = {
  status?: ContentPostStatus | ContentPostStatus[];
  postType?: ContentPostType;
  category?: string;
  /** Filter posts whose tags array contains this value (e.g. featured). */
  tag?: string;
  publicOnly?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: "published" | "views" | "updated";
};

export type ListAnnouncementsOptions = {
  status?: AnnouncementStatus | AnnouncementStatus[];
  visibility?: AnnouncementVisibility;
  announcementType?: AnnouncementType | "all";
  sort?: import("@/lib/platform-content/parse-announcement-filters").AnnouncementSort;
  publicOnly?: boolean;
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  search?: string;
};

export type ListNotificationCampaignsOptions = {
  status?: CampaignStatus | CampaignStatus[];
  limit?: number;
  offset?: number;
};

export type ListUserNotificationsOptions = {
  userId: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
};

export type BuildSeoMetadataInput = {
  pathname: string;
  pageType?: string;
  title?: string;
  description?: string;
  canonicalUrl?: string | null;
  indexableOverride?: boolean;
  followOverride?: boolean;
  ogImage?: string | null;
};
