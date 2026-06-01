import { isSponsoredContentEnabled } from "@/lib/campaigns/feature";
import {
  campaignMatchesChapterTarget,
  campaignMatchesCreatorStudio,
  campaignMatchesStoryTarget
} from "@/lib/campaigns/match-campaign-target";
import {
  getActiveCampaignForPlacement,
  getCampaignCenterSettings,
  getPublicCampaignForContent
} from "@/lib/supabase/campaigns";
import { DEFAULT_CAMPAIGN_CENTER_SETTINGS } from "@/types/campaign";
import type { CampaignCenterSettings, CampaignWithSponsor } from "@/types/campaign";

export type PublicCampaignContext = {
  enabled: boolean;
  settings: CampaignCenterSettings;
  discoverBanner: CampaignWithSponsor | null;
  communityBanner: CampaignWithSponsor | null;
  reelsNativeCard: CampaignWithSponsor | null;
};

export async function loadPublicCampaignContext(): Promise<PublicCampaignContext> {
  const enabled = await isSponsoredContentEnabled();
  if (!enabled) {
    return {
      enabled: false,
      settings: DEFAULT_CAMPAIGN_CENTER_SETTINGS,
      discoverBanner: null,
      communityBanner: null,
      reelsNativeCard: null
    };
  }

  const { data: settings } = await getCampaignCenterSettings();
  const showDiscoverBanner = settings.bannerEnabled && settings.discoverBannerMax > 0;
  const showCommunityBanner = settings.bannerEnabled && settings.communityFeedMax > 0;
  const showReelsNative = settings.nativeCardEnabled;

  const [discoverBanner, communityBanner, reelsNativeCard] = await Promise.all([
    showDiscoverBanner
      ? getActiveCampaignForPlacement("discover_banner", "banner", settings)
      : Promise.resolve(null),
    showCommunityBanner
      ? getActiveCampaignForPlacement("discover_banner", "banner", settings)
      : Promise.resolve(null),
    showReelsNative
      ? getActiveCampaignForPlacement("reels_native_card", "native_card", settings)
      : Promise.resolve(null)
  ]);

  return {
    enabled: true,
    settings,
    discoverBanner,
    communityBanner,
    reelsNativeCard
  };
}

export function sponsoredBannerProps(campaign: CampaignWithSponsor, challengeId?: string | null) {
  return {
    campaignId: campaign.id,
    sponsorId: campaign.sponsor?.id ?? null,
    challengeId: challengeId ?? null,
    sponsorName: campaign.sponsor?.name ?? "Nhà tài trợ",
    sponsorLogoUrl: campaign.sponsor?.logoUrl,
    disclosureText: campaign.disclosureText,
    ctaText: campaign.ctaText,
    ctaUrl: campaign.ctaUrl,
    targetType: campaign.targetType,
    targetId: campaign.targetId,
    description: campaign.description
  };
}

export async function loadStorySponsorCampaign(story: {
  id: string;
  slug: string;
}): Promise<CampaignWithSponsor | null> {
  const enabled = await isSponsoredContentEnabled();
  if (!enabled) return null;

  const { data: settings } = await getCampaignCenterSettings();
  return getPublicCampaignForContent({
    placement: "story_sponsor_badge",
    campaignType: "story_sponsorship",
    settings,
    matches: (campaign) => campaignMatchesStoryTarget(campaign, story)
  });
}

export async function loadChapterEndCampaign(
  story: { id: string; slug: string },
  chapter: { id: string }
): Promise<CampaignWithSponsor | null> {
  const enabled = await isSponsoredContentEnabled();
  if (!enabled) return null;

  const { data: settings } = await getCampaignCenterSettings();
  return getPublicCampaignForContent({
    placement: "chapter_end_cta",
    campaignType: "story_sponsorship",
    settings,
    matches: (campaign) => campaignMatchesChapterTarget(campaign, story, chapter)
  });
}

export async function loadCreatorStudioCampaign(): Promise<CampaignWithSponsor | null> {
  const enabled = await isSponsoredContentEnabled();
  if (!enabled) return null;

  const { data: settings } = await getCampaignCenterSettings();
  return getPublicCampaignForContent({
    placement: "creator_studio_opportunity",
    campaignType: "creator_opportunity",
    settings,
    matches: (campaign) => campaignMatchesCreatorStudio(campaign)
  });
}
