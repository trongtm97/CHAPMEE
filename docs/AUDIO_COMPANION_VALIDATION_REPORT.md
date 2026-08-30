# Audio Companion Validation Report

Story-level audio MVP validation checklist and tooling.

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Link checker | `npm run audio:check-links` | Dry-run external/YouTube link checks |
| Link checker (apply) | `npm run audio:check-links -- --apply` | Persist `last_check_status` / mark broken |
| Companion validator | `npm run audio:validate` | Static policy + structure checks |
| Companion validator (DB) | `npm run audio:validate -- --with-db` | Adds database integrity checks |

## Ads guard

- Policy function: `canShowAdsOnAudio(story, audioItem, settings)` in `src/lib/audio/audio-policy.ts`
- Resolver: `src/lib/audio/audio-ads-guard.ts`
- UI wrapper: `src/components/audio/AudioCompanionAdSlot.tsx`

Integrated surfaces:

- `/audio` — `audio_landing_feed` placement (when any visible item passes policy)
- Story detail Audio tab — `story_audio_section`
- Chapter reader story-audio CTA — `reader_story_audio_cta` (only near CTA block, not player controls)

Rules enforced:

- No render when `audio_ads_enabled` is false
- No render when item `ads_policy = ads_disabled`
- Translation unverified blocked unless admin enables `translated_story_audio_ads_allowed_when_unverified`
- YouTube embed ads off unless `youtube_ads_on_embed_pages_enabled`
- Hidden while user listens in background (`document.hidden` + global player playing)
- `background_ad_refresh_enabled` remains false by default in policy save path

## Broken link checker

- Library: `src/lib/audio/audio-link-checker.ts`
- CLI: `scripts/check-audio-links.ts`

Behavior:

- Dry-run by default; `--apply` writes status updates
- External: HEAD with short timeout, safe minimal GET range request fallback
- YouTube: format / video id validation only (no YouTube API, no download)
- Summary fields: `checked`, `ok`, `failed`, `unknown`, `skipped`, `errors`

## Static validation coverage

`scripts/validate-audio-companion.ts` checks:

- Global player state has no `chapterId` / `chapterTitle`
- Mobile bottom nav remains 4 tabs
- Policy defaults (YouTube background/continuous off, paid/coin off, background ad refresh off)
- `canShowAdsOnAudio` blocks unverified translation by default
- Forbidden UI/pattern scan in `app/`, `components/`, `src/components/` `.tsx` files

With `--with-db`:

- No `audio_items` without `story_id`
- No published audio on unpublished/non-public stories
- No `is_free = false`
- YouTube rows must have `youtube_video_id`
- External rows must have URL
- YouTube background/continuous flags false
- Translation unverified + `ads_allowed` guard
- External queue ordering sanity

## Forbidden pattern search

Run manually:

```bash
grep -R "youtube.*mp3\|ytdl\|download.*youtube\|proxy.*audio\|audio-only\|autoplay\|background.*youtube\|Nghe chương này\|Đọc chương\|chapter_id.*audio\|chapterAudio\|buildQueueFromChapter\|auto_play_next_chapter\|max_audio_items_per_chapter\|allow_chapter_level_audio" -n src app components lib scripts 2>/dev/null
```

### Results (2026-06-02)

| Pattern | Status |
|---------|--------|
| `youtube.*mp3`, `ytdl`, `download.*youtube`, `proxy.*audio`, `audio-only` | Clean in app code (only listed in validator script) |
| `Nghe chương này`, `chapterAudio`, `buildQueueFromChapter`, chapter-level audio flags | Clean |
| `autoplay` | **Allowed exceptions:** iframe `allow="... autoplay ..."` on YouTube embeds (browser capability list, playback is user-initiated); admin policy field `autoplay_audio_enabled` (default false) |
| `background.*youtube` | **Allowed exceptions:** policy keys `background_audio_youtube_enabled` default false in `lib/settings/audio-policy-settings.ts`, admin form, and `lib/admin/audio-admin.ts` save path |
| `Đọc chương` | **Allowed exceptions:** non-audio surfaces (`types/ads.ts` placement label `chapter_reader`, SEO templates, story reading CTAs). Validator scopes audio UI paths only. |
| `chapter_id.*audio` | Clean in public audio UI |

## Release sign-off

- [x] `npm run audio:validate` — 6/6 passed (DB skipped without `--with-db`)
- [ ] `npm run audio:validate -- --with-db` (run when Postgres has `audio_items` data)
- [x] `npm run audio:check-links` — dry-run OK (0 rows in local DB)
- [x] `npm run build` — passed
- [ ] Manual smoke: story audio tab, chapter CTA, `/audio`, global player queue

### Build fixes (Prompt 9 close-out)

- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx` — compute ads flag after `audioData` fetch
- `src/lib/audio/audio-ads-guard.ts` — `pickStoryAudioAdRepresentativeItem` synchronous (no accidental `Promise` to `canShowAdsOnAudio`)
