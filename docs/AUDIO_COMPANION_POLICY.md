# Audio Companion Policy (Story-Level Only)

## Policy goals

- Keep Audio Companion aligned with ChapMee text-story core.
- Enforce story-level ownership (`story_id`) and reject chapter-level coupling.
- Allow author flexibility (external URL or YouTube embed) with admin-governed safety controls.
- Keep audio free for all users (no paid/unlock path).

## Policy settings (proposed, app-settings based)

Store as JSON in `app_settings` (same pattern as content-origin policy). Key suggestion:
- `audio_companion_policy_settings`

```json
{
  "audio_enabled": true,
  "external_audio_enabled": true,
  "youtube_embed_enabled": true,
  "require_linked_story": true,
  "story_level_audio_only": true,
  "allow_audio_parts": true,
  "audio_must_be_free": true,
  "paid_audio_enabled": false,
  "coin_unlock_audio_enabled": false,
  "audio_tips_enabled": false,
  "audio_ads_enabled": true,
  "default_audio_status": "pending_review",
  "auto_publish_for_trusted_creators": false,
  "require_rights_declaration": true,
  "max_audio_items_per_story": 100,
  "allowed_external_audio_domains": [],
  "blocked_external_audio_domains": [],
  "original_story_audio_ads_allowed": true,
  "translated_story_audio_ads_requires_verified_rights": true,
  "translated_story_audio_ads_allowed_when_unverified": false,
  "youtube_ads_on_embed_pages_enabled": false,
  "external_audio_ads_enabled": true,
  "background_ad_refresh_enabled": false,
  "background_audio_enabled": true,
  "background_audio_external_enabled": true,
  "background_audio_youtube_enabled": false,
  "continuous_playback_enabled": true,
  "continuous_playback_external_enabled": true,
  "continuous_playback_youtube_enabled": false,
  "continuous_playback_story_audio_enabled": true,
  "auto_play_next_audio_part_enabled": true,
  "remember_audio_progress_enabled": true,
  "media_session_enabled": true,
  "lock_screen_controls_enabled": true,
  "sleep_timer_enabled": true,
  "autoplay_audio_enabled": false,
  "show_audio_badge_on_story_cards": true,
  "show_story_audio_cta_on_chapter_reader": true,
  "show_continue_listening": true,
  "show_continuous_playback_badge": true,
  "require_admin_review_for_youtube": false,
  "require_admin_review_for_external_audio": false,
  "broken_link_check_enabled": true,
  "broken_link_check_interval_hours": 24,
  "hide_broken_audio_automatically": false
}
```

Chapter-level settings are intentionally excluded and must not be added for MVP:
- `allow_chapter_level_audio`
- `max_audio_items_per_chapter`
- `skip_missing_chapter_audio`
- `auto_play_next_chapter_enabled`
- `show_audio_badges_on_chapter_list`

## Policy engine design

## Inputs

- Global settings (`audio_companion_policy_settings`).
- Story-level rights context (`content_origin`, `rights_status`, story visibility/status).
- User role (admin/mod/creator/reader).
- Audio item source type and metadata.

## Derived capabilities

- `canAttachAudioToStory`
- `canUseExternalAudioUrl`
- `canUseYouTubeEmbed`
- `canPublishAudioItem`
- `canBackgroundPlayExternal`
- `canInsertIntoGlobalPlayer`
- `canShowAudioAds`
- `canExposeAudioPublicly`

## Hard invariants

- `story_id` is mandatory and must exist.
- `chapter_id` is never allowed in audio schemas/APIs.
- Any request implying audio-only entity without story must be rejected.
- Paid/unlock fields for audio are always false/unsupported.
- YouTube source is local iframe playback only.
- YouTube is never added into ChapMee Global Audio Player queue.
- YouTube background playback is always disabled in ChapMee player.

## Evaluation order

1. Global feature enabled?
2. Story exists and is eligible?
3. Story rights/status permits companion audio?
4. Source type allowed by policy?
5. Item passes validation (part/order/url)?
6. Public/ads behavior derived from policy flags.

## Shared policy engine (implemented)

Centralized in `src/lib/audio/audio-policy.ts` and consumed by services/actions to avoid UI hard-code.

- Capability and gating:
  - `getAudioCapabilities()`
  - `buildStoryAudioCapabilities()`
  - `canCreateStoryAudio()`
  - `canPublishStoryAudio()`
- Source/playback gating:
  - `canUseExternalAudioUrl()`
  - `canUseYoutubeEmbed()`
  - `canUseBackgroundPlayback()`
  - `canUseContinuousPlayback()`
  - `canAutoPlayNextAudioPart()`
- Ads/read bridge:
  - `canShowAdsOnAudio()`
  - `canShowStoryAudioCTAOnChapterReader()`
- Assertions (hard reject):
  - `assertAudioMustBeLinkedToStory()`
  - `assertStoryLevelAudioOnly()`
  - `assertAudioIsFree()`
  - `assertAudioSourceAllowed()`
  - `assertBackgroundPlaybackAllowed()`
  - `assertContinuousPlaybackAllowed()`

The capability result includes `reasonCodes` for deterministic explainability.

## Policy examples

- `original + external_audio_url`
  - Ads allowed when `audio_ads_enabled=true`, `external_audio_ads_enabled=true`, and rights are `self_declared`/`verified`.
  - Background + continuous playback allowed when corresponding playback flags are enabled.
- `translated(unverified) + external_audio_url`
  - Ads disabled by default when `translated_story_audio_ads_requires_verified_rights=true`.
  - Background + continuous playback can still be allowed by playback policy.
- `translated(verified) + external_audio_url`
  - Ads allowed if translated-rights rule passes and external audio ads are enabled.
- `youtube_embed`
  - Iframe-only path.
  - Never background playback by ChapMee player.
  - Never continuous playback in ChapMee Global Audio Player queue.
- `any input with chapter_id`
  - Rejected by `assertStoryLevelAudioOnly()` when `story_level_audio_only=true`.

## Admin controls and governance

## Admin screens (proposed)

- `Admin > Audio Companion > Settings`
  - Feature toggle, source-type toggles, validation thresholds.
  - Background playback and YouTube restrictions.
  - Ads policy for audio surface.
- `Admin > Audio Companion > Link Health`
  - Broken/suspect list with filters + pagination.
- `Admin > Audit`
  - Reuse existing audit log with audio policy action types.

## Admin policy actions to log

- `audio_policy.updated`
- `audio_policy.ads.updated`
- `audio_item.blocked`
- `audio_item.unblocked`
- `audio_item.marked_broken`
- `audio_item.restored`

Each audit row should include actor, timestamp, old/new values, reason, and target story/item.

## Pagination requirement for large admin pages

- Required for all large lists:
  - audio items list
  - broken links list
  - audio moderation queue
  - policy change history
- Reuse existing query-param pagination style (`page`, `pageSize`, filters).

## Ads policy rules

- Ads can show only if:
  - global audio ads enabled, and
  - source/item eligible by policy, and
  - story is public and audio item active.
- No ad refresh loop while external audio continues in background.
- YouTube iframe surface should not trigger custom background ad refresh behavior.

## Content-origin and rights integration

- Audio companion should follow story rights policy gates.
- If story rights status becomes restricted:
  - hide audio publicly or block playback per policy.
- Translation/origin capabilities can later narrow audio availability without schema changes.

## Data validation policy

- URL must be normalized and protocol-safe (`https` preferred).
- YouTube URL must resolve to valid video id.
- External URL domain blocklist/allowlist may be introduced via settings.
- Duplicate `part_number` or `sort_order` under same story is invalid.

## Enforcement surfaces

- Studio server actions/API validation.
- Admin moderation operations.
- Public render guards before UI exposure.
- Player guardrails before playback/queue insertion.

## Security and abuse notes

- Do not proxy remote media through app for MVP.
- Avoid server-side long fetch for unknown media hosts.
- Apply strict sanitization for any embed-related params.
- Rate-limit create/update actions for audio items.

## Risk notes

- External links can break unexpectedly.
- YouTube terms and embed behavior may change; iframe contract must stay strict.
- Policy misconfiguration could accidentally expose ads/unwanted autoplay; keep explicit toggles with safe defaults.
