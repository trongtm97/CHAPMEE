export type SponsorStatus = "active" | "inactive";

export type CampaignType = "sponsored_challenge" | "banner" | "native_card";

export type CampaignStatus = "draft" | "active" | "paused" | "ended";

export type SponsorRecord = {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  status: SponsorStatus;
  createdAt: string;
  updatedAt: string;
};

export type BrandCampaignRecord = {
  id: string;
  sponsorId: string;
  name: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  budgetVnd: number | null;
  revenueVnd: number | null;
  startsAt: string | null;
  endsAt: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  disclosureText: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignWithSponsor = BrandCampaignRecord & {
  sponsor: SponsorRecord | null;
};
