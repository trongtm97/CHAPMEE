"use client";

import { analyticsCategories, analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";

type CampaignTrackingInput = {
  campaignId: string;
  sponsorId: string | null;
  challengeId?: string | null;
};

function buildMetadata(input: CampaignTrackingInput) {
  return {
    campaign_id: input.campaignId,
    sponsor_id: input.sponsorId,
    challenge_id: input.challengeId ?? null
  };
}

export function trackSponsoredCampaignViewed(input: CampaignTrackingInput) {
  return trackEvent({
    eventName: analyticsEvents.sponsoredCampaignViewed,
    category: analyticsCategories.monetization,
    targetType: "challenge",
    targetId: input.campaignId,
    metadata: buildMetadata(input)
  });
}

export function trackSponsoredCampaignClicked(input: CampaignTrackingInput) {
  return trackEvent({
    eventName: analyticsEvents.sponsoredCampaignClicked,
    category: analyticsCategories.monetization,
    targetType: "challenge",
    targetId: input.campaignId,
    metadata: buildMetadata(input)
  });
}

export function trackSponsoredChallengeViewed(input: CampaignTrackingInput) {
  return trackEvent({
    eventName: analyticsEvents.sponsoredChallengeViewed,
    category: analyticsCategories.monetization,
    targetType: "challenge",
    targetId: input.challengeId ?? input.campaignId,
    metadata: buildMetadata(input)
  });
}

export function trackSponsoredChallengeJoined(input: CampaignTrackingInput) {
  return trackEvent({
    eventName: analyticsEvents.sponsoredChallengeJoined,
    category: analyticsCategories.monetization,
    targetType: "challenge",
    targetId: input.challengeId ?? input.campaignId,
    metadata: buildMetadata(input)
  });
}

export function trackSponsoredChallengeEntrySubmitted(input: CampaignTrackingInput) {
  return trackEvent({
    eventName: analyticsEvents.sponsoredChallengeEntrySubmitted,
    category: analyticsCategories.monetization,
    targetType: "challenge",
    targetId: input.challengeId ?? input.campaignId,
    metadata: buildMetadata(input)
  });
}
