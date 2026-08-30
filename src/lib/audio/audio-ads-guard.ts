import {
  getAudioPolicySettings,
  type AudioPolicySettings
} from "@/lib/settings/audio-policy-settings";
import {
  canShowAdsOnAudio,
  type AudioItemLike,
  type StoryLike
} from "@/src/lib/audio/audio-policy";

export { canShowAdsOnAudio };

export type AudioCompanionAdContext = {
  canShowAds: boolean;
  reasonCodes: string[];
};

export type AudioAdRefreshGuardInput = {
  documentHidden: boolean;
  audioPlayingInBackground: boolean;
  settings?: AudioPolicySettings;
};

function buildReasonCodes(story: StoryLike, audioItem: AudioItemLike, settings: AudioPolicySettings): string[] {
  const reasons: string[] = [];
  if (!settings.audio_enabled) reasons.push("audio_disabled");
  if (!settings.audio_ads_enabled) reasons.push("audio_ads_disabled");
  if (audioItem.ads_policy === "ads_disabled") reasons.push("item_ads_disabled");
  if (audioItem.audio_source_type === "youtube_embed" && !settings.youtube_ads_on_embed_pages_enabled) {
    reasons.push("youtube_embed_ads_disabled");
  }
  if (audioItem.audio_source_type === "external_audio_url" && !settings.external_audio_ads_enabled) {
    reasons.push("external_audio_ads_disabled");
  }
  const origin = String(story.content_origin ?? story.contentOrigin ?? "original").toLowerCase();
  if (
    (origin === "translation" || origin === "translated") &&
    settings.translated_story_audio_ads_requires_verified_rights &&
    !settings.translated_story_audio_ads_allowed_when_unverified
  ) {
    const rights = String(audioItem.rights_status ?? story.rights_status ?? story.rightsStatus ?? "").toLowerCase();
    if (rights !== "verified") {
      reasons.push("translation_unverified_ads_disabled");
    }
  }
  return reasons;
}

export function resolveAudioCompanionAdContext(
  story: StoryLike,
  audioItem: AudioItemLike,
  settings: AudioPolicySettings
): AudioCompanionAdContext {
  const canShowAds = canShowAdsOnAudio(story, audioItem, settings);
  return {
    canShowAds,
    reasonCodes: canShowAds ? [] : buildReasonCodes(story, audioItem, settings)
  };
}

export async function resolveAudioCompanionAdContextAsync(
  story: StoryLike,
  audioItem: AudioItemLike
): Promise<AudioCompanionAdContext> {
  const settings = await getAudioPolicySettings();
  const canShowAds = canShowAdsOnAudio(story, audioItem, settings);
  return {
    canShowAds,
    reasonCodes: canShowAds ? [] : buildReasonCodes(story, audioItem, settings)
  };
}

/** Whether companion ad slots should avoid refresh/remount while user listens in background. */
export function shouldBlockAudioCompanionAdRefresh(
  input: AudioAdRefreshGuardInput,
  settings?: AudioPolicySettings
): boolean {
  const config = settings;
  if (!config) {
    return input.documentHidden || input.audioPlayingInBackground;
  }
  if (!config.background_ad_refresh_enabled) {
    return input.documentHidden || input.audioPlayingInBackground;
  }
  return input.documentHidden || input.audioPlayingInBackground;
}

export function pickStoryAudioAdRepresentativeItem<T extends AudioItemLike & { status?: string | null }>(
  items: T[]
): T | null {
  const published = items.filter((item) => String(item.status ?? "").toLowerCase() === "published");
  return published.find((item) => item.audio_source_type === "external_audio_url") ?? published[0] ?? null;
}
