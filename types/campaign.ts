export type SponsorStatus = "active" | "inactive" | "paused" | "archived";

export type CampaignType =
  | "sponsored_challenge"
  | "banner"
  | "native_card"
  | "creator_opportunity"
  | "story_sponsorship";

export type FutureCampaignType =
  | "rewarded_ads"
  | "brand_mission"
  | "affiliate_campaign";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "ended"
  | "archived";

export type CampaignPlacement =
  | "discover_banner"
  | "community_sponsored_challenge"
  | "reels_native_card"
  | "story_sponsor_badge"
  | "chapter_end_cta"
  | "creator_studio_opportunity"
  | "search_ranking_promoted";

export type CampaignTargetType =
  | "story"
  | "chapter"
  | "community_challenge"
  | "creator_studio"
  | "external_url"
  | "none";

export type SponsorRecord = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  status: SponsorStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SponsorWithStats = SponsorRecord & {
  campaignCount: number;
  totalRevenueVnd: number;
};

export type BrandCampaignRecord = {
  id: string;
  sponsorId: string;
  name: string;
  campaignType: CampaignType;
  placement: CampaignPlacement | null;
  status: CampaignStatus;
  budgetVnd: number | null;
  revenueVnd: number | null;
  startsAt: string | null;
  endsAt: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  targetType: CampaignTargetType | null;
  targetId: string | null;
  disclosureText: string;
  description: string | null;
  adminNote: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignWithSponsor = BrandCampaignRecord & {
  sponsor: SponsorRecord | null;
};

export type CampaignMetricsRow = {
  id: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  joins: number;
  createdAt: string;
};

export type CampaignMetricsSummary = {
  totalImpressions: number;
  totalClicks: number;
  totalJoins: number;
  hasTrackingData: boolean;
};

export type CampaignCenterSettings = {
  campaignsPublicEnabled: boolean;
  sponsoredChallengeEnabled: boolean;
  nativeCardEnabled: boolean;
  bannerEnabled: boolean;
  disclosureRequired: boolean;
  maxActivePerPlacement: number;
  reelsNativeFrequency: number;
  discoverBannerMax: number;
  communityFeedMax: number;
};

export const DEFAULT_CAMPAIGN_CENTER_SETTINGS: CampaignCenterSettings = {
  campaignsPublicEnabled: true,
  sponsoredChallengeEnabled: true,
  nativeCardEnabled: true,
  bannerEnabled: true,
  disclosureRequired: true,
  maxActivePerPlacement: 3,
  reelsNativeFrequency: 8,
  discoverBannerMax: 2,
  communityFeedMax: 2
};

export type CampaignStaffPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canPause: boolean;
  canArchive: boolean;
  canViewFinance: boolean;
  canManageSponsors: boolean;
  canUpdateSettings: boolean;
};

export type CampaignFormInput = {
  sponsorId: string;
  name: string;
  campaignType: CampaignType;
  placement: CampaignPlacement | null;
  status: CampaignStatus;
  budgetVnd: number | null;
  revenueVnd: number | null;
  startsAt: string | null;
  endsAt: string | null;
  disclosureText: string;
  ctaText: string | null;
  ctaUrl: string | null;
  targetType: CampaignTargetType | null;
  targetId: string | null;
  description: string | null;
  adminNote: string | null;
  challengeId?: string | null;
};

export type SponsorFormInput = {
  name: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  status: SponsorStatus;
  notes: string | null;
};
