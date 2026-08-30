# Audio Companion Implementation Notes

## Prompt 4 scope

Implemented backend/service foundation for story-level audio companion:

- audio item service CRUD + moderation state actions
- story-level continuous queue builder (external audio only)
- listening progress service (story/audio level)
- server actions for studio/public flows

No large UI implementation included.

## Implemented files

- `src/lib/audio/audio-items.ts`
- `src/lib/audio/audio-queue.ts`
- `src/lib/audio/audio-progress.ts`
- `app/actions/audio-items.ts`
- `app/studio/stories/[storyId]/audio/actions.ts`

## Enforcement highlights

- Rejects any `chapter_id` in audio input.
- Requires `story_id` and validates creator ownership for write actions.
- Uses centralized policy engine and URL helpers for source validation.
- Parses YouTube id server-side and normalizes external URLs server-side.
- Forces free-only audio for MVP (`is_free=true`).
- Rejects paid/coin unlock payload fields.
- Enforces `max_audio_items_per_story`.
- Public list/queue is `published` only.
- Continuous queue excludes YouTube and includes external audio only.
- Queue order: `part_number ASC (nulls last)`, `sort_order ASC`, `created_at ASC`.
- Queue item shape has no `chapterId` or `chapterTitle`.

## Audit/admin behavior

- Publish/hide supports creator ownership and admin override.
- Admin override path writes audit entry via `logAdminAction()`.

## Studio UI (Prompt 6)

- Route: `/studio/stories/[storyId]/audio`
- Page: `app/studio/(workspace)/stories/[storyId]/audio/page.tsx`
- Components: `components/studio/audio/*`
  - `StudioAudioWorkspace` — intro, policy notes, add/edit form, filters, list
  - `ExternalAudioForm`, `YoutubeAudioForm` (iframe preview only for YouTube)
  - `StudioAudioList` — actions: preview, edit, submit, publish, hide, delete draft
  - `AudioRightsDeclaration` — required checkbox on create/update

## Public UI (Prompt 7)

- `/audio` landing + filters/pagination
- `StoryAudioSection`, `StoryAudioCTABox`, `AudioItemCard`, `YoutubeEmbedPlayer`
- Desktop nav link to `/audio` (mobile bottom nav unchanged — 4 tabs)

## Admin Audio Center (Prompt 8)

- `/admin/audio`, `/admin/audio/review`, `/admin/audio/broken-links`, `/admin/audio/policy`
- `lib/admin/audio-admin.ts` + `src/components/admin/audio/*`

## Ads guard + ops (Prompt 9)

- `src/lib/audio/audio-ads-guard.ts` — `canShowAdsOnAudio` integration helpers
- `src/components/audio/AudioCompanionAdSlot.tsx` — policy + background-listening guard
- `src/lib/audio/audio-link-checker.ts` + `scripts/check-audio-links.ts`
- `scripts/validate-audio-companion.ts`
- `docs/AUDIO_COMPANION_VALIDATION_REPORT.md`

## Next implementation steps

- Add client throttling for progress save interval (e.g. 10-15 seconds) on public story page.
- Register ad placement keys (`audio_landing_feed`, `story_audio_section`, `reader_story_audio_cta`) in admin ads config when ready.
- Schedule `audio:check-links` in ops cron (dry-run alert + optional `--apply`).
