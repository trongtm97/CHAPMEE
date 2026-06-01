export type ContentHubTabId = "posts" | "announcements" | "campaigns" | "seo";

export type ContentHubAdminCapabilities = {
  canViewPosts: boolean;
  canCreatePosts: boolean;
  canUpdatePosts: boolean;
  canViewAnnouncements: boolean;
  canCreateAnnouncements: boolean;
  canUpdateAnnouncements: boolean;
  canViewCampaigns: boolean;
  canCreateCampaigns: boolean;
  canUpdateCampaigns: boolean;
  canViewSeo: boolean;
  canUpdateSeo: boolean;
  canViewSeoAudit: boolean;
};

export type ContentPostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string;
  post_type: string;
  status: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  indexable: boolean;
};

export type AnnouncementFormValues = {
  title: string;
  slug: string;
  body: string;
  announcement_type: string;
  visibility: string;
  status: string;
  priority: string;
  indexable: boolean;
};

export type NotificationCampaignFormValues = {
  title: string;
  message: string;
  notification_type: string;
  channel_in_app: boolean;
  channel_email: boolean;
  target_mode: string;
  target_segments: string;
  status: string;
};

export type SeoRuleFormValues = {
  route_pattern: string;
  page_type: string;
  indexable: boolean;
  follow_links: boolean;
  title_template: string;
  description_template: string;
  canonical_mode: string;
  custom_canonical_url: string;
  notes: string;
};

export type ContentHubActionResult = {
  ok: boolean;
  message: string | null;
  id?: string;
};
