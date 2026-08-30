import {
  defaultAudioPolicySettings,
  type AudioPolicySettings
} from "@/lib/settings/audio-policy-settings";
import { validateExternalAudioUrl, validateYoutubeUrl } from "./audio-url";

type MaybeValue = string | number | boolean | null | undefined;

export type AudioInputLike = {
  story_id?: string | null;
  chapter_id?: string | null;
  audio_source_type?: "external_audio_url" | "youtube_embed" | string | null;
  external_audio_url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  is_free?: boolean | null;
  price?: number | null;
  price_coins?: number | null;
  coin_unlock_price?: number | null;
  unlock_type?: string | null;
  background_playback_allowed?: boolean | null;
  continuous_playback_allowed?: boolean | null;
};

export type StoryLike = {
  id?: string | null;
  storyId?: string | null;
  contentOrigin?: string | null;
  content_origin?: string | null;
  rightsStatus?: string | null;
  rights_status?: string | null;
  status?: string | null;
  isPublished?: boolean | null;
};

export type AudioItemLike = {
  audio_source_type?: "external_audio_url" | "youtube_embed" | string | null;
  status?: string | null;
  rights_status?: string | null;
  ads_policy?: "inherit" | "ads_allowed" | "ads_disabled" | "pending_review" | string | null;
  is_free?: boolean | null;
  background_playback_allowed?: boolean | null;
  continuous_playback_allowed?: boolean | null;
};

export type ProfileLike = {
  id?: string | null;
  isAdmin?: boolean | null;
  isCreator?: boolean | null;
  trustLevel?: string | null;
  isTrustedCreator?: boolean | null;
};

export type AudioPolicyResult = {
  audioEnabled: boolean;
  canCreateAudio: boolean;
  allowedSourceTypes: Array<"external_audio_url" | "youtube_embed">;
  mustBeLinkedToStory: boolean;
  storyLevelAudioOnly: boolean;
  mustBeFree: boolean;
  canShowAds: boolean;
  canUseExternalAudio: boolean;
  canUseYoutubeEmbed: boolean;
  canUseBackgroundPlayback: boolean;
  canUseContinuousPlayback: boolean;
  canAutoPlayNextAudioPart: boolean;
  reasonCodes: string[];
  publicBadges: string[];
};

function resolveSettings(settings?: AudioPolicySettings): AudioPolicySettings {
  return settings ?? defaultAudioPolicySettings;
}

function isTruthyNumber(value: MaybeValue): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmpty(value: MaybeValue): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveSourceType(input?: AudioInputLike | AudioItemLike | null): "external_audio_url" | "youtube_embed" | null {
  const value = input?.audio_source_type;
  if (value === "external_audio_url" || value === "youtube_embed") {
    return value;
  }
  return null;
}

function resolveStoryOrigin(story?: StoryLike | null): string {
  return (story?.content_origin ?? story?.contentOrigin ?? "original").toLowerCase();
}

function resolveRightsStatus(story?: StoryLike | null, audioItem?: AudioItemLike | null): string {
  const value = audioItem?.rights_status ?? story?.rights_status ?? story?.rightsStatus ?? "self_declared";
  return String(value).toLowerCase();
}

function hasStoryId(value: AudioInputLike | StoryLike | null | undefined): boolean {
  if (!value) return false;
  const storyId = (value as AudioInputLike).story_id ?? (value as StoryLike).id ?? (value as StoryLike).storyId;
  return isNonEmpty(storyId);
}

function inferAllowedSourceTypes(settings: AudioPolicySettings): Array<"external_audio_url" | "youtube_embed"> {
  const sourceTypes: Array<"external_audio_url" | "youtube_embed"> = [];
  if (settings.external_audio_enabled) {
    sourceTypes.push("external_audio_url");
  }
  if (settings.youtube_embed_enabled) {
    sourceTypes.push("youtube_embed");
  }
  return sourceTypes;
}

export function assertAudioMustBeLinkedToStory(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  if (!config.require_linked_story) {
    return;
  }
  if (!hasStoryId(input)) {
    throw new Error("AUDIO_POLICY_REQUIRE_STORY_ID");
  }
}

export function assertStoryLevelAudioOnly(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  if (!config.story_level_audio_only) {
    return;
  }
  if (isNonEmpty(input.chapter_id ?? null)) {
    throw new Error("AUDIO_POLICY_CHAPTER_LEVEL_FORBIDDEN");
  }
}

export function assertAudioIsFree(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  if (config.audio_must_be_free && input.is_free === false) {
    throw new Error("AUDIO_POLICY_MUST_BE_FREE");
  }

  if (!config.paid_audio_enabled) {
    const hasPaidFields =
      isTruthyNumber(input.price) ||
      isTruthyNumber(input.price_coins) ||
      isTruthyNumber(input.coin_unlock_price) ||
      isNonEmpty(input.unlock_type);
    if (hasPaidFields) {
      throw new Error("AUDIO_POLICY_PAID_AUDIO_DISABLED");
    }
  }

  if (!config.coin_unlock_audio_enabled && (isTruthyNumber(input.coin_unlock_price) || isNonEmpty(input.unlock_type))) {
    throw new Error("AUDIO_POLICY_COIN_UNLOCK_DISABLED");
  }
}

export function assertAudioSourceAllowed(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  if (!config.audio_enabled) {
    throw new Error("AUDIO_POLICY_AUDIO_DISABLED");
  }

  const sourceType = resolveSourceType(input);
  if (!sourceType) {
    throw new Error("AUDIO_POLICY_INVALID_SOURCE_TYPE");
  }

  if (sourceType === "external_audio_url") {
    if (!config.external_audio_enabled) {
      throw new Error("AUDIO_POLICY_EXTERNAL_DISABLED");
    }
    const result = validateExternalAudioUrl(input.external_audio_url ?? "", config);
    if (!result.ok) {
      throw new Error(`AUDIO_POLICY_EXTERNAL_URL_INVALID:${result.reasonCode ?? "unknown"}`);
    }
  }

  if (sourceType === "youtube_embed") {
    if (!config.youtube_embed_enabled) {
      throw new Error("AUDIO_POLICY_YOUTUBE_DISABLED");
    }
    const result = validateYoutubeUrl(input.youtube_url ?? "", config);
    if (!result.ok && !isNonEmpty(input.youtube_video_id)) {
      throw new Error(`AUDIO_POLICY_YOUTUBE_URL_INVALID:${result.reasonCode ?? "unknown"}`);
    }
  }
}

export function assertBackgroundPlaybackAllowed(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  const sourceType = resolveSourceType(input);
  const requested = input.background_playback_allowed === true;

  if (!requested) {
    return;
  }

  const allowed =
    sourceType === "external_audio_url" &&
    config.background_audio_enabled &&
    config.background_audio_external_enabled;
  if (!allowed) {
    throw new Error("AUDIO_POLICY_BACKGROUND_PLAYBACK_FORBIDDEN");
  }
}

export function assertContinuousPlaybackAllowed(input: AudioInputLike, settings?: AudioPolicySettings): void {
  const config = resolveSettings(settings);
  const sourceType = resolveSourceType(input);
  const requested = input.continuous_playback_allowed === true;

  if (!requested) {
    return;
  }

  const allowed =
    sourceType === "external_audio_url" &&
    config.continuous_playback_enabled &&
    config.continuous_playback_external_enabled &&
    config.continuous_playback_story_audio_enabled;
  if (!allowed) {
    throw new Error("AUDIO_POLICY_CONTINUOUS_PLAYBACK_FORBIDDEN");
  }
}

export function canUseExternalAudioUrl(url: string, settings?: AudioPolicySettings): boolean {
  const config = resolveSettings(settings);
  return validateExternalAudioUrl(url, config).ok;
}

export function canUseYoutubeEmbed(url: string, settings?: AudioPolicySettings): boolean {
  const config = resolveSettings(settings);
  return validateYoutubeUrl(url, config).ok;
}

export function canCreateStoryAudio(profile: ProfileLike, story: StoryLike, settings?: AudioPolicySettings): boolean {
  const config = resolveSettings(settings);
  if (!config.audio_enabled) return false;
  if (!hasStoryId(story)) return false;
  if (config.require_linked_story && !hasStoryId(story)) return false;
  if (profile.isAdmin) return true;
  return profile.isCreator === true;
}

export function canPublishStoryAudio(
  profile: ProfileLike,
  story: StoryLike,
  audioInput: AudioInputLike,
  settings?: AudioPolicySettings
): boolean {
  const config = resolveSettings(settings);
  if (!canCreateStoryAudio(profile, story, config)) return false;

  try {
    assertAudioMustBeLinkedToStory(audioInput, config);
    assertStoryLevelAudioOnly(audioInput, config);
    assertAudioIsFree(audioInput, config);
    assertAudioSourceAllowed(audioInput, config);
    assertBackgroundPlaybackAllowed(audioInput, config);
    assertContinuousPlaybackAllowed(audioInput, config);
  } catch {
    return false;
  }

  if (profile.isAdmin) return true;
  if (config.auto_publish_for_trusted_creators && profile.isTrustedCreator) return true;
  return config.default_audio_status === "published";
}

export function canShowAdsOnAudio(story: StoryLike, audioItem: AudioItemLike, settings?: AudioPolicySettings): boolean {
  const config = resolveSettings(settings);
  if (!config.audio_enabled || !config.audio_ads_enabled) return false;
  if (audioItem.ads_policy === "ads_disabled") return false;
  if (audioItem.ads_policy === "pending_review") return false;

  const sourceType = resolveSourceType(audioItem);
  if (sourceType === "youtube_embed") {
    return config.youtube_ads_on_embed_pages_enabled;
  }
  if (sourceType !== "external_audio_url") {
    return false;
  }
  if (!config.external_audio_ads_enabled) {
    return false;
  }

  const origin = resolveStoryOrigin(story);
  const rights = resolveRightsStatus(story, audioItem);

  if (origin === "translated" || origin === "translation") {
    if (config.translated_story_audio_ads_requires_verified_rights) {
      if (rights === "verified") {
        return true;
      }
      return config.translated_story_audio_ads_allowed_when_unverified;
    }
    return config.translated_story_audio_ads_allowed_when_unverified || rights === "verified";
  }

  if (!config.original_story_audio_ads_allowed) {
    return false;
  }
  return rights === "self_declared" || rights === "verified";
}

export function canUseBackgroundPlayback(story: StoryLike, audioItem: AudioItemLike, settings?: AudioPolicySettings): boolean {
  void story;
  const config = resolveSettings(settings);
  const sourceType = resolveSourceType(audioItem);
  if (!config.audio_enabled || !config.background_audio_enabled) {
    return false;
  }
  if (sourceType !== "external_audio_url") {
    return false;
  }
  return config.background_audio_external_enabled;
}

export function canUseContinuousPlayback(story: StoryLike, audioItem: AudioItemLike, settings?: AudioPolicySettings): boolean {
  void story;
  const config = resolveSettings(settings);
  const sourceType = resolveSourceType(audioItem);
  if (!config.audio_enabled || !config.continuous_playback_enabled) {
    return false;
  }
  if (sourceType !== "external_audio_url") {
    return false;
  }
  return config.continuous_playback_external_enabled && config.continuous_playback_story_audio_enabled;
}

export function canAutoPlayNextAudioPart(story: StoryLike, audioItem: AudioItemLike, settings?: AudioPolicySettings): boolean {
  if (!canUseContinuousPlayback(story, audioItem, settings)) {
    return false;
  }
  const config = resolveSettings(settings);
  return config.auto_play_next_audio_part_enabled;
}

export function canShowStoryAudioCTAOnChapterReader(story: StoryLike, settings?: AudioPolicySettings): boolean {
  const config = resolveSettings(settings);
  return config.audio_enabled && config.show_story_audio_cta_on_chapter_reader && hasStoryId(story);
}

export function getAudioStatusLabel(audioItem: AudioItemLike): string {
  const status = (audioItem.status ?? "").toLowerCase();
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_review":
      return "Pending review";
    case "published":
      return "Published";
    case "hidden":
      return "Hidden";
    case "broken":
      return "Broken link";
    case "rejected":
      return "Rejected";
    case "copyright_disputed":
      return "Copyright disputed";
    default:
      return "Unknown";
  }
}

export function getAudioPublicBadges(story: StoryLike, audioItem: AudioItemLike, settings?: AudioPolicySettings): string[] {
  const config = resolveSettings(settings);
  const badges: string[] = [];
  if (config.audio_must_be_free) {
    badges.push("free");
  }
  if (config.show_audio_badge_on_story_cards) {
    badges.push("audio_companion");
  }
  if (canUseBackgroundPlayback(story, audioItem, config)) {
    badges.push("background_playback");
  }
  if (canUseContinuousPlayback(story, audioItem, config)) {
    badges.push("continuous_playback");
  }
  return badges;
}

export function getAudioCapabilities(
  story: StoryLike,
  audioItem?: AudioItemLike | null,
  settings?: AudioPolicySettings
): AudioPolicyResult {
  const config = resolveSettings(settings);
  const item = audioItem ?? {};
  const reasonCodes: string[] = [];

  const allowedSourceTypes = inferAllowedSourceTypes(config);
  const canCreateAudio = config.audio_enabled && hasStoryId(story);
  if (!config.audio_enabled) reasonCodes.push("audio_disabled");
  if (config.require_linked_story && !hasStoryId(story)) reasonCodes.push("missing_story_id");

  const canUseExternalAudio = config.audio_enabled && config.external_audio_enabled;
  if (!config.external_audio_enabled) reasonCodes.push("external_audio_disabled");

  const canUseYoutubeEmbed = config.audio_enabled && config.youtube_embed_enabled;
  if (!config.youtube_embed_enabled) reasonCodes.push("youtube_embed_disabled");

  const sourceType = resolveSourceType(item);
  const canUseBackground = canUseBackgroundPlayback(story, item, config);
  const canUseContinuous = canUseContinuousPlayback(story, item, config);
  const canAutoPlay = canAutoPlayNextAudioPart(story, item, config);

  if (sourceType === "youtube_embed") {
    reasonCodes.push("youtube_no_background_playback");
    reasonCodes.push("youtube_not_in_global_continuous_playback");
  }
  if (sourceType === "external_audio_url" && !canUseBackground) {
    reasonCodes.push("external_background_playback_disabled");
  }
  if (sourceType === "external_audio_url" && !canUseContinuous) {
    reasonCodes.push("external_continuous_playback_disabled");
  }

  const canShowAds = canShowAdsOnAudio(story, item, config);
  if (!canShowAds) {
    reasonCodes.push("ads_not_allowed_for_context");
  }

  return {
    audioEnabled: config.audio_enabled,
    canCreateAudio,
    allowedSourceTypes,
    mustBeLinkedToStory: config.require_linked_story,
    storyLevelAudioOnly: config.story_level_audio_only,
    mustBeFree: config.audio_must_be_free,
    canShowAds,
    canUseExternalAudio,
    canUseYoutubeEmbed,
    canUseBackgroundPlayback: canUseBackground,
    canUseContinuousPlayback: canUseContinuous,
    canAutoPlayNextAudioPart: canAutoPlay,
    reasonCodes: Array.from(new Set(reasonCodes)),
    publicBadges: getAudioPublicBadges(story, item, config)
  };
}

export function buildStoryAudioCapabilities(story: StoryLike, settings?: AudioPolicySettings): AudioPolicyResult {
  return getAudioCapabilities(story, undefined, settings);
}
