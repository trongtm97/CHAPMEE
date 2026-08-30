import { z } from "zod";
import { fetchAppSettingByKey } from "@/lib/data/app-settings";

export const AUDIO_POLICY_SETTINGS_KEY = "audio_companion_policy_settings";

const settingsSchema = z.object({
  audio_enabled: z.boolean().default(true),
  external_audio_enabled: z.boolean().default(true),
  youtube_embed_enabled: z.boolean().default(true),
  require_linked_story: z.boolean().default(true),
  story_level_audio_only: z.boolean().default(true),
  allow_audio_parts: z.boolean().default(true),
  audio_must_be_free: z.boolean().default(true),
  paid_audio_enabled: z.boolean().default(false),
  coin_unlock_audio_enabled: z.boolean().default(false),
  audio_tips_enabled: z.boolean().default(false),
  audio_ads_enabled: z.boolean().default(true),

  default_audio_status: z.enum(["draft", "pending_review", "published", "hidden"]).default("pending_review"),
  auto_publish_for_trusted_creators: z.boolean().default(false),
  require_rights_declaration: z.boolean().default(true),
  max_audio_items_per_story: z.number().int().positive().max(1000).default(100),
  allowed_external_audio_domains: z.array(z.string()).default([]),
  blocked_external_audio_domains: z.array(z.string()).default([]),

  original_story_audio_ads_allowed: z.boolean().default(true),
  translated_story_audio_ads_requires_verified_rights: z.boolean().default(true),
  translated_story_audio_ads_allowed_when_unverified: z.boolean().default(false),
  youtube_ads_on_embed_pages_enabled: z.boolean().default(false),
  external_audio_ads_enabled: z.boolean().default(true),
  background_ad_refresh_enabled: z.boolean().default(false),

  background_audio_enabled: z.boolean().default(true),
  background_audio_external_enabled: z.boolean().default(true),
  background_audio_youtube_enabled: z.boolean().default(false),
  continuous_playback_enabled: z.boolean().default(true),
  continuous_playback_external_enabled: z.boolean().default(true),
  continuous_playback_youtube_enabled: z.boolean().default(false),
  continuous_playback_story_audio_enabled: z.boolean().default(true),
  auto_play_next_audio_part_enabled: z.boolean().default(true),
  remember_audio_progress_enabled: z.boolean().default(true),
  media_session_enabled: z.boolean().default(true),
  lock_screen_controls_enabled: z.boolean().default(true),
  sleep_timer_enabled: z.boolean().default(true),
  autoplay_audio_enabled: z.boolean().default(false),

  show_audio_badge_on_story_cards: z.boolean().default(true),
  show_story_audio_cta_on_chapter_reader: z.boolean().default(true),
  show_continue_listening: z.boolean().default(true),
  show_continuous_playback_badge: z.boolean().default(true),

  require_admin_review_for_youtube: z.boolean().default(false),
  require_admin_review_for_external_audio: z.boolean().default(false),
  broken_link_check_enabled: z.boolean().default(true),
  broken_link_check_interval_hours: z.number().int().positive().max(168).default(24),
  hide_broken_audio_automatically: z.boolean().default(false)
});

export type AudioPolicySettings = z.infer<typeof settingsSchema>;

export const defaultAudioPolicySettings: AudioPolicySettings = settingsSchema.parse({});

export function parseAudioPolicySettings(raw: unknown): AudioPolicySettings {
  const parsed = settingsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultAudioPolicySettings;
}

export async function getAudioPolicySettings(): Promise<AudioPolicySettings> {
  const row = await fetchAppSettingByKey(AUDIO_POLICY_SETTINGS_KEY);
  if (!row) {
    return defaultAudioPolicySettings;
  }
  return parseAudioPolicySettings(row.value);
}
