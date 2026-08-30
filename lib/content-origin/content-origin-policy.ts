import {
  ContentOriginPolicyError,
  type ContentOrigin,
  type RightsStatus,
  type StoryMonetizationCapabilities,
  type StoryMonetizationPolicy,
  type StoryOriginPolicyInput
} from "@/lib/content-origin/content-origin-types";
import {
  defaultContentOriginPolicySettings,
  type ContentOriginPolicySettings
} from "@/lib/settings/content-origin-policy-settings";

function toContentOrigin(value: string | null | undefined): ContentOrigin {
  return value === "translation" ? "translation" : "original";
}

function toRightsStatus(value: string | null | undefined): RightsStatus {
  if (
    value === "verified" ||
    value === "pending_review" ||
    value === "rejected" ||
    value === "expired"
  ) {
    return value;
  }
  return "unverified";
}

function toMonetizationPolicy(
  value: string | null | undefined
): StoryMonetizationPolicy {
  if (
    value === "full" ||
    value === "free_only" ||
    value === "ads_tips_allowed" ||
    value === "no_monetization"
  ) {
    return value;
  }
  return "full";
}

function isRightsExpiredAt(input: StoryOriginPolicyInput): boolean {
  if (!input.rights_expires_at) return false;
  const value =
    input.rights_expires_at instanceof Date
      ? input.rights_expires_at.getTime()
      : new Date(input.rights_expires_at).getTime();
  return Number.isFinite(value) && value <= Date.now();
}

export function getStoryContentOrigin(story: StoryOriginPolicyInput): ContentOrigin {
  return toContentOrigin(story.content_origin);
}

export function isOriginalStory(story: StoryOriginPolicyInput): boolean {
  return getStoryContentOrigin(story) === "original";
}

export function isTranslatedStory(story: StoryOriginPolicyInput): boolean {
  return getStoryContentOrigin(story) === "translation";
}

export function getStoryMonetizationCapabilities(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
): StoryMonetizationCapabilities {
  const settings = adminSettings ?? defaultContentOriginPolicySettings;
  const contentOrigin = getStoryContentOrigin(story);
  const policy = toMonetizationPolicy(story.monetization_policy);
  const rawRightsStatus = toRightsStatus(story.rights_status);
  const rightsStatus = isRightsExpiredAt(story) ? "expired" : rawRightsStatus;
  const reasonCodes: string[] = [];
  const publicBadges: string[] = [];

  if (contentOrigin === "original") {
    const originalAllowed = settings.original_full_monetization_enabled;
    if (!originalAllowed) {
      reasonCodes.push("ORIGINAL_FULL_MONETIZATION_DISABLED");
    }
    publicBadges.push("Truyen Sang Tac");
    return {
      contentOrigin,
      mustBeFreeToRead: !originalAllowed,
      canSellChapters: originalAllowed,
      canSellStoryBundle: originalAllowed,
      canUseCoinUnlock: originalAllowed,
      canReceiveTips: originalAllowed,
      canShareAdsRevenue: originalAllowed,
      canJoinBoostCampaign: originalAllowed,
      reasonCodes,
      publicBadges
    };
  }

  publicBadges.push("Truyen Dich");
  reasonCodes.push("TRANSLATION_FREE_READ_REQUIRED");

  let canReceiveTips = true;
  let canShareAdsRevenue = true;
  let canJoinBoostCampaign = true;

  const monetizationBlocked =
    policy === "no_monetization" || policy === "free_only";
  if (monetizationBlocked) {
    canReceiveTips = false;
    canShareAdsRevenue = false;
    reasonCodes.push("TRANSLATION_POLICY_NO_MONETIZATION");
  } else if (policy !== "ads_tips_allowed") {
    canReceiveTips = false;
    canShareAdsRevenue = false;
    reasonCodes.push("TRANSLATION_POLICY_NOT_ADS_TIPS_ALLOWED");
  }

  const rightsVerified = rightsStatus === "verified";
  if (
    settings.translation_tips_requires_verified_rights &&
    !rightsVerified
  ) {
    canReceiveTips = false;
    reasonCodes.push("TRANSLATION_TIPS_RIGHTS_NOT_VERIFIED");
  }
  if (
    settings.translation_ads_requires_verified_rights &&
    !rightsVerified
  ) {
    canShareAdsRevenue = false;
    reasonCodes.push("TRANSLATION_ADS_RIGHTS_NOT_VERIFIED");
  }

  if (
    rightsStatus === "rejected" ||
    rightsStatus === "expired" ||
    rightsStatus === "pending_review" ||
    rightsStatus === "unverified"
  ) {
    if (rightsStatus === "rejected") {
      reasonCodes.push("TRANSLATION_RIGHTS_REJECTED");
    } else if (rightsStatus === "expired") {
      reasonCodes.push("TRANSLATION_RIGHTS_EXPIRED");
    } else if (rightsStatus === "pending_review") {
      reasonCodes.push("TRANSLATION_RIGHTS_PENDING_REVIEW");
    } else {
      reasonCodes.push("TRANSLATION_RIGHTS_UNVERIFIED");
    }
  }

  if (
    settings.translation_boost_requires_verified_rights &&
    !rightsVerified
  ) {
    canJoinBoostCampaign = false;
    reasonCodes.push("TRANSLATION_BOOST_RIGHTS_NOT_VERIFIED");
  }
  if (rightsStatus === "rejected" || rightsStatus === "expired") {
    canJoinBoostCampaign = false;
    reasonCodes.push("TRANSLATION_BOOST_BLOCKED_BY_RIGHTS_STATUS");
  }

  const canSellChapters = settings.translation_paid_chapters_allowed;
  const canSellStoryBundle = settings.translation_story_bundle_allowed;
  const canUseCoinUnlock = settings.translation_coin_unlock_allowed;
  if (!canSellChapters) reasonCodes.push("TRANSLATION_CHAPTER_SALES_BLOCKED");
  if (!canSellStoryBundle) reasonCodes.push("TRANSLATION_STORY_BUNDLE_BLOCKED");
  if (!canUseCoinUnlock) reasonCodes.push("TRANSLATION_COIN_UNLOCK_BLOCKED");

  return {
    contentOrigin,
    mustBeFreeToRead: true,
    canSellChapters,
    canSellStoryBundle,
    canUseCoinUnlock,
    canReceiveTips,
    canShareAdsRevenue,
    canJoinBoostCampaign,
    reasonCodes: [...new Set(reasonCodes)],
    publicBadges
  };
}

function assertCapability(
  story: StoryOriginPolicyInput,
  allowed: boolean,
  code: string,
  message: string,
  adminSettings?: ContentOriginPolicySettings
) {
  if (allowed) return;
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  throw new ContentOriginPolicyError(
    `${message} (${caps.reasonCodes.join(", ") || code})`,
    code
  );
}

export function assertCanSellChapter(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canSellChapters,
    "SELL_CHAPTER_BLOCKED",
    "Story khong duoc phep ban chuong",
    adminSettings
  );
}

export function assertCanSellStoryBundle(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canSellStoryBundle,
    "SELL_STORY_BUNDLE_BLOCKED",
    "Story khong duoc phep ban tron bo",
    adminSettings
  );
}

export function assertCanReceiveTips(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canReceiveTips,
    "RECEIVE_TIPS_BLOCKED",
    "Story khong duoc phep nhan tips",
    adminSettings
  );
}

export function assertCanShareAdsRevenue(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canShareAdsRevenue,
    "ADS_REVENUE_BLOCKED",
    "Story khong duoc phep chia doanh thu quang cao",
    adminSettings
  );
}

export function assertCanUseCoinUnlock(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canUseCoinUnlock,
    "COIN_UNLOCK_BLOCKED",
    "Story khong duoc phep coin unlock",
    adminSettings
  );
}

export function assertCanJoinBoostCampaign(
  story: StoryOriginPolicyInput,
  adminSettings?: ContentOriginPolicySettings
) {
  const caps = getStoryMonetizationCapabilities(story, adminSettings);
  assertCapability(
    story,
    caps.canJoinBoostCampaign,
    "BOOST_CAMPAIGN_BLOCKED",
    "Story khong duoc phep tham gia boost campaign",
    adminSettings
  );
}

export function getStoryOriginBadge(story: StoryOriginPolicyInput): string {
  return isTranslatedStory(story) ? "Truyen Dich" : "Truyen Sang Tac";
}

export function getStoryFreeReadLabel(story: StoryOriginPolicyInput): string {
  const caps = getStoryMonetizationCapabilities(story);
  if (caps.mustBeFreeToRead) {
    return "Doc mien phi 100%";
  }
  return "Co the co noi dung tra phi";
}

