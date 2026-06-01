import { isPlacementAvailable } from "@/lib/campaigns/constants";
import type {
  BrandCampaignRecord,
  CampaignCenterSettings,
  CampaignStatus,
  CampaignWithSponsor
} from "@/types/campaign";

const PUBLIC_STATUSES: CampaignStatus[] = ["active", "scheduled"];

export function isCampaignWithinSchedule(campaign: Pick<BrandCampaignRecord, "startsAt" | "endsAt">) {
  const now = Date.now();
  const startsAt = campaign.startsAt ? new Date(campaign.startsAt).getTime() : null;
  const endsAt = campaign.endsAt ? new Date(campaign.endsAt).getTime() : null;
  if (startsAt !== null && now < startsAt) return false;
  if (endsAt !== null && now > endsAt) return false;
  return true;
}

export function isCampaignPubliclyVisible(
  campaign: BrandCampaignRecord,
  settings?: CampaignCenterSettings | null
): boolean {
  if (settings && !settings.campaignsPublicEnabled) return false;

  if (campaign.status === "scheduled") {
    if (!campaign.startsAt) return false;
    const startsAt = new Date(campaign.startsAt).getTime();
    if (Date.now() < startsAt) return false;
    if (campaign.endsAt && Date.now() > new Date(campaign.endsAt).getTime()) return false;
    if (!isPlacementAvailable(campaign.placement)) return false;
    return Boolean(campaign.disclosureText?.trim());
  }

  if (campaign.status !== "active") return false;
  if (!isCampaignWithinSchedule(campaign)) return false;
  if (!isPlacementAvailable(campaign.placement)) return false;
  if (!campaign.disclosureText?.trim()) return false;

  if (settings) {
    if (campaign.campaignType === "sponsored_challenge" && !settings.sponsoredChallengeEnabled) {
      return false;
    }
    if (campaign.campaignType === "native_card" && !settings.nativeCardEnabled) {
      return false;
    }
    if (campaign.campaignType === "banner" && !settings.bannerEnabled) {
      return false;
    }
  }

  return true;
}

export function filterPublicCampaigns(
  campaigns: CampaignWithSponsor[],
  settings?: CampaignCenterSettings | null
) {
  return campaigns.filter((campaign) => isCampaignPubliclyVisible(campaign, settings));
}

export function getCampaignCtaHref(campaign: Pick<BrandCampaignRecord, "targetType" | "targetId" | "ctaUrl">) {
  if (campaign.targetType === "external_url" && campaign.ctaUrl) {
    return campaign.ctaUrl;
  }
  if (campaign.targetType === "story" && campaign.targetId) {
    return `/story/${campaign.targetId}`;
  }
  if (campaign.targetType === "chapter" && campaign.targetId) {
    return `/chapter/${campaign.targetId}`;
  }
  if (campaign.targetType === "community_challenge" && campaign.targetId) {
    return `/challenges/${campaign.targetId}`;
  }
  if (campaign.targetType === "creator_studio") {
    return "/creator";
  }
  return campaign.ctaUrl ?? null;
}

export function isExternalCampaignLink(campaign: Pick<BrandCampaignRecord, "targetType" | "ctaUrl">) {
  return campaign.targetType === "external_url" || Boolean(campaign.ctaUrl?.match(/^https?:\/\//i));
}

export function countCampaignsByStatus(campaigns: BrandCampaignRecord[]) {
  const counts: Record<CampaignStatus, number> = {
    draft: 0,
    scheduled: 0,
    active: 0,
    paused: 0,
    ended: 0,
    archived: 0
  };
  for (const campaign of campaigns) {
    counts[campaign.status] += 1;
  }
  return counts;
}

export function sumCampaignBudget(campaigns: BrandCampaignRecord[]) {
  return campaigns.reduce((sum, c) => sum + (c.budgetVnd ?? 0), 0);
}

export function sumCampaignRevenue(campaigns: BrandCampaignRecord[]) {
  return campaigns.reduce((sum, c) => sum + (c.revenueVnd ?? 0), 0);
}

export function countActiveSponsoredChallenges(campaigns: BrandCampaignRecord[]) {
  return campaigns.filter(
    (c) => c.campaignType === "sponsored_challenge" && c.status === "active"
  ).length;
}

export function isStatusPublicCandidate(status: CampaignStatus) {
  return PUBLIC_STATUSES.includes(status);
}
