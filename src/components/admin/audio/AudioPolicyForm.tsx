import { updateAudioPolicyAction } from "@/app/admin/audio/actions";
import type { AudioPolicySettings } from "@/lib/settings/audio-policy-settings";

type AudioPolicyFormProps = {
  settings: AudioPolicySettings;
};

const BOOL_FIELDS: Array<keyof AudioPolicySettings> = [
  "audio_enabled",
  "external_audio_enabled",
  "youtube_embed_enabled",
  "require_linked_story",
  "story_level_audio_only",
  "allow_audio_parts",
  "audio_must_be_free",
  "paid_audio_enabled",
  "coin_unlock_audio_enabled",
  "audio_tips_enabled",
  "audio_ads_enabled",
  "auto_publish_for_trusted_creators",
  "original_story_audio_ads_allowed",
  "translated_story_audio_ads_requires_verified_rights",
  "translated_story_audio_ads_allowed_when_unverified",
  "youtube_ads_on_embed_pages_enabled",
  "external_audio_ads_enabled",
  "background_ad_refresh_enabled",
  "background_audio_enabled",
  "background_audio_external_enabled",
  "background_audio_youtube_enabled",
  "continuous_playback_enabled",
  "continuous_playback_external_enabled",
  "continuous_playback_youtube_enabled",
  "continuous_playback_story_audio_enabled",
  "auto_play_next_audio_part_enabled",
  "remember_audio_progress_enabled",
  "media_session_enabled",
  "lock_screen_controls_enabled",
  "sleep_timer_enabled",
  "autoplay_audio_enabled",
  "show_audio_badge_on_story_cards",
  "show_story_audio_cta_on_chapter_reader",
  "show_continue_listening",
  "show_continuous_playback_badge",
  "require_admin_review_for_youtube",
  "require_admin_review_for_external_audio",
  "broken_link_check_enabled",
  "hide_broken_audio_automatically"
];

export function AudioPolicyForm({ settings }: AudioPolicyFormProps) {
  return (
    <form action={updateAudioPolicyAction} className="space-y-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
        paid/coin flags là future flags (giữ false), YouTube background/continuous phải false trong MVP, background_ad_refresh_enabled nên false.
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {BOOL_FIELDS.map((key) => (
          <label className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm" key={key}>
            <span className="text-zinc-200">{key}</span>
            <select className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm" defaultValue={String(Boolean(settings[key]))} name={key}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">default_audio_status</span>
          <select className="w-full rounded border border-white/20 bg-black/40 px-2 py-2" defaultValue={settings.default_audio_status} name="default_audio_status">
            <option value="draft">draft</option>
            <option value="pending_review">pending_review</option>
            <option value="published">published</option>
            <option value="hidden">hidden</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">max_audio_items_per_story</span>
          <input className="w-full rounded border border-white/20 bg-black/40 px-2 py-2" defaultValue={settings.max_audio_items_per_story} name="max_audio_items_per_story" type="number" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">broken_link_check_interval_hours</span>
          <input className="w-full rounded border border-white/20 bg-black/40 px-2 py-2" defaultValue={settings.broken_link_check_interval_hours} name="broken_link_check_interval_hours" type="number" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-zinc-300">allowed_external_audio_domains (comma)</span>
          <input className="w-full rounded border border-white/20 bg-black/40 px-2 py-2" defaultValue={settings.allowed_external_audio_domains.join(",")} name="allowed_external_audio_domains" type="text" />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-zinc-300">blocked_external_audio_domains (comma)</span>
          <input className="w-full rounded border border-white/20 bg-black/40 px-2 py-2" defaultValue={settings.blocked_external_audio_domains.join(",")} name="blocked_external_audio_domains" type="text" />
        </label>
      </div>
      <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-cyan-200" type="submit">
        Lưu policy
      </button>
    </form>
  );
}
