# Audio Continuous Playback Plan (External Audio Only)

## Objective

Design continuous listening across story audio parts with a Global Audio Player, while keeping strict source behavior:
- External audio: allowed in global queue + background playback.
- YouTube embed: iframe-only, local page playback, no queue/global/background by ChapMee.

## Playback model

## Queue entity (client-side)

```ts
type AudioQueueItem = {
  audioItemId: string;
  storyId: string;
  storySlug?: string;
  storyTitle?: string;
  partNumber: number;
  sortOrder: number;
  title: string;
  sourceType: "external_audio_url";
  externalAudioUrl: string;
  durationSeconds?: number;
};
```

Rules:
- Queue accepts only `external_audio_url`.
- Sort comparator: `partNumber ASC`, `sortOrder ASC`, `created_at ASC` fallback.
- Deduplicate by `audioItemId`.

## Global player state (client-side)

```ts
type GlobalAudioPlayerState = {
  queue: AudioQueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration?: number;
  playbackRate: number;
  muted: boolean;
  volume: number;
  source: "external_audio_url" | null;
  storyContext?: { storyId: string; storySlug?: string; storyTitle?: string };
};
```

## Continuous playback behavior

1. User presses play on a story external part.
2. Player builds queue from active external parts in that story.
3. Player starts selected part at index N.
4. On `ended`, move to `N+1` automatically if exists.
5. If queue ends, stop and mark session complete.
6. No autoplay on app/page load; playback starts only after explicit user action.

## Background playback rules

- Enabled only for external audio.
- Keep HTMLAudioElement at app shell level (not inside chapter page subtree).
- Route changes must not destroy player state.
- If source changes to YouTube context, global player is not used.
- All checks must call centralized policy engine (`src/lib/audio/audio-policy.ts`) instead of UI hard-code.

## Media Session API plan

Use `navigator.mediaSession` for external audio only:
- Metadata: title, story title, optional artwork from story cover.
- Action handlers:
  - `play`, `pause`
  - `seekbackward`, `seekforward`
  - `previoustrack`, `nexttrack`
  - optional `seekto`

Do not configure Media Session for YouTube iframe path.

## Progress saving plan

## Save cadence

- Throttled writes (e.g., every 10-15s while playing).
- Immediate write on:
  - pause
  - route leave
  - visibility hidden
  - track end

## Progress semantics

- Keyed by `user_id + audio_item_id`.
- `progress_seconds` tracks latest stable position.
- `completed=true` when reaching threshold (example >= 95%).
- Keep `story_id` for Read<->Listen bridge and /me aggregation.

## Resume logic

- Re-enter story companion:
  - if unfinished item exists, show "Continue listening".
  - resume at persisted `progress_seconds`.
- If item becomes broken/hidden, skip and choose next playable item.

## API surface (proposed)

- `GET /api/audio/story-items?storyId=...`
  - returns active parts + source metadata.
- `POST /api/audio/progress`
  - upsert listening progress for authenticated user.
- `GET /api/audio/progress?storyId=...`
  - fetch resume data for story context.

No chapter input in endpoints.

## Reader/chapter interaction

- Chapter page does not host continuous audio queue.
- Show only compact story-level CTA:
  - "Truyen nay co ban audio"
  - link to story listen section.
- Inputs containing `chapter_id` are rejected by policy assertions (story-level audio only).

## Ads and playback interaction

- Ad display in audio companion is policy-gated.
- During external background playback:
  - do not trigger periodic ad refresh tied to playback timer.
- Ad telemetry should be event-driven, not time-loop refresh.

## Broken link resilience

- On playback error for external URL:
  - mark local item failed in session
  - auto-skip to next part
  - report failure event for later moderation review
- If all parts fail, stop queue and show recoverable error UI.

## Observability events (proposed)

- `audio_queue_created`
- `audio_play_started`
- `audio_play_paused`
- `audio_play_resumed`
- `audio_play_ended`
- `audio_play_error`
- `audio_queue_advanced`
- `audio_progress_saved`
- `audio_background_active`

All events should include `story_id`, `audio_item_id`, `source_type`; never `chapter_id`.

## Edge cases

- Story edited while queue playing: keep current queue snapshot until session ends.
- Part reorder after queue created: apply new order on next queue creation only.
- User logs out mid-session: continue local playback but stop server progress writes.
- Network loss: keep local state; retry progress sync when online.

## Capability examples

- `original + external`: background/continuous may be enabled by policy.
- `translated + unverified + external`: ads disabled by default, playback may still be enabled.
- `translated + verified + external`: ads can be enabled by policy.
- `youtube_embed`: no background playback, no ChapMee continuous queue.
