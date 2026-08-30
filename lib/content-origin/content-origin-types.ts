export const CONTENT_ORIGIN_VALUES = ["original", "translation"] as const;
export type ContentOrigin = (typeof CONTENT_ORIGIN_VALUES)[number];

export const TRANSLATION_TYPE_VALUES = [
  "official_license",
  "creator_authorized",
  "public_domain",
  "creative_commons",
  "fan_translation",
  "unknown"
] as const;
export type TranslationType = (typeof TRANSLATION_TYPE_VALUES)[number];

export const RIGHTS_STATUS_VALUES = [
  "verified",
  "pending_review",
  "unverified",
  "rejected",
  "expired"
] as const;
export type RightsStatus = (typeof RIGHTS_STATUS_VALUES)[number];

export const MONETIZATION_POLICY_VALUES = [
  "full",
  "free_only",
  "ads_tips_allowed",
  "no_monetization"
] as const;
export type StoryMonetizationPolicy = (typeof MONETIZATION_POLICY_VALUES)[number];

export type StoryOriginPolicyInput = {
  id?: string | null;
  content_origin?: string | null;
  translation_type?: string | null;
  rights_status?: string | null;
  monetization_policy?: string | null;
  rights_expires_at?: string | Date | null;
};

export type StoryMonetizationCapabilities = {
  contentOrigin: ContentOrigin;
  mustBeFreeToRead: boolean;
  canSellChapters: boolean;
  canSellStoryBundle: boolean;
  canUseCoinUnlock: boolean;
  canReceiveTips: boolean;
  canShareAdsRevenue: boolean;
  canJoinBoostCampaign: boolean;
  reasonCodes: string[];
  publicBadges: string[];
};

export class ContentOriginPolicyError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ContentOriginPolicyError";
    this.code = code;
  }
}

