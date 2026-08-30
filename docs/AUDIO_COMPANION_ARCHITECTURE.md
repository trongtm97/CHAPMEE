# Audio Companion Architecture (Story-Level Only)

## Scope and non-goals

- Audio Companion is an add-on listening surface for existing text stories.
- Audio items must always bind to `story_id` only.
- No audio-only content, no chapter-level audio, no `chapter_id` in audio data model.
- MVP supports:
  - `external_audio_url` (author-owned external link).
  - `youtube_embed` (official YouTube iframe only).
- No paid audio, no coin unlock, no early-access audio gating.
- No audio upload, no proxy/rehost/download, no YouTube extraction.
- No mobile bottom-nav tab changes (keep 4 tabs).

## Current state audit

## Story and reader surfaces

- `app/stories/[slug]/page.tsx`: story detail route, no audio companion surface yet.
- `components/story/StoryDetailPage.tsx`: story UI composition, no listen CTA block.
- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`: chapter reader entry, chapter-centric flow.
- `components/reader/ReaderPage.tsx`: chapter UI shell, no story-level audio panel.
- `components/reader/ReadingProgressTracker.tsx`: reading progress only, no listening progress.
- `lib/stories/getStoryBySlug.ts`, `lib/episodes/getEpisodeReaderData.ts`: no audio metadata fetch path.

## Studio and creator flows

- `components/studio/stories/StudioStoryForm.tsx`: story settings form, no audio parts section.
- `lib/creator/createStory.ts`, `lib/creator/updateStory.ts`: no audio companion persistence.
- `lib/creator/createEpisode.ts`, `lib/creator/updateEpisode.ts`: chapter publishing is chapter-first and not suitable for audio binding.

## Admin, settings, policy, audit

- `lib/settings/content-origin-policy-settings.ts`: app-settings + zod pattern exists.
- `lib/content-origin/content-origin-policy.ts`: capability engine pattern exists.
- `lib/admin/content-origin-admin.ts`: admin update + audit + revalidate pattern exists.
- `lib/audit/log-admin-action.ts`, `app/admin/audit/page.tsx`: existing audit-log rails.
- `app/admin/content-origins/page.tsx`, `app/admin/translations/page.tsx`: pagination patterns available.

## Ads and monetization

- `components/ads/ChapMeeAdSlot.tsx`, `app/api/ads/events/route.ts`: ad placement + event logging exist.
- `lib/monetization/paid-chapters.ts`, `lib/monetization/early-access.ts`: chapter-centric monetization; must not be reused for audio unlock.
- No audio ad policy toggles currently.

## Media, youtube, player, queue

- `app/api/media/presign-upload/route.ts`, `app/api/media/complete-upload/route.ts`: media asset pipeline exists but not audio-companion specific.
- No existing YouTube embed model/renderer for companion audio.
- No existing global audio player, playback queue, media session integration, or listening-progress store.

## Discover and /me

- `app/discover/page.tsx`, `components/discover/DiscoverFeed.tsx`: no audio companion badges/entry points.
- `app/me/page.tsx`, `components/me/DesktopMePage.tsx`, `components/me/MobileMePage.tsx`: no listening history or mini-player integration.

## Proposed domain model (story-level only)

## `audio_items` (proposed)

Purpose: store audio parts for a story. One story can have multiple parts (`part_number`, `sort_order`).

```sql
create table if not exists public.audio_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  source_type text not null check (source_type in ('external_audio_url', 'youtube_embed')),
  title text not null,
  description text,
  part_number integer not null default 1 check (part_number > 0),
  sort_order integer not null default 1 check (sort_order > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  external_audio_url text,
  youtube_url text,
  youtube_video_id text,
  status text not null default 'active' check (status in ('active', 'hidden', 'blocked')),
  broken_link_status text not null default 'unknown' check (broken_link_status in ('unknown', 'ok', 'suspect', 'broken')),
  broken_link_checked_at timestamptz,
  ads_eligible boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, part_number),
  unique (story_id, sort_order),
  check (
    (source_type = 'external_audio_url' and external_audio_url is not null and youtube_url is null and youtube_video_id is null)
    or
    (source_type = 'youtube_embed' and youtube_url is not null and youtube_video_id is not null and external_audio_url is null)
  )
);
```

Notes:
- Strictly no `chapter_id`.
- `ads_eligible` is still controlled by policy engine; item flag alone is not enough.

## `audio_listening_progress` (proposed)

Purpose: persist user listening state per audio part for resume.

```sql
create table if not exists public.audio_listening_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  audio_item_id uuid not null references public.audio_items(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  completion_ratio numeric(5,4) check (completion_ratio is null or (completion_ratio >= 0 and completion_ratio <= 1)),
  completed boolean not null default false,
  last_position_at timestamptz not null default now(),
  device_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, audio_item_id)
);
```

Notes:
- Strictly no `chapter_id`.
- Story-level bridge data comes from `story_id` + `audio_item_id`.

## Story-level behavior contract

- A story may have zero or many audio parts.
- Audio parts are ordered by `part_number` then `sort_order`.
- External parts may enter Global Audio Player queue.
- YouTube parts stay local in story page iframe panel and do not enter global queue.
- Reader chapter page shows only light CTA: "Truyen nay co ban audio" and links to story-level listen surface.

## Studio flow (MVP)

1. Author opens story settings in Studio.
2. Author adds audio part list for that story:
   - Select source: external URL or YouTube.
   - Fill title, optional description, part number, sort order.
3. Validation:
   - Must belong to story.
   - URL normalization and domain check.
   - Duplicate part/sort blocked.
4. Save creates/updates `audio_items`.
5. If link health check fails, mark `broken_link_status=suspect` and show warning in Studio.

## Public UI flow

## Story page (`/stories/[slug]`)

- Show "Listen Companion" block when story has active audio items.
- Segment by source type:
  - External list: playable in global player.
  - YouTube list: open embedded panel per item.
- Show lightweight badges (Part x, duration, source).

## Reader page (`/stories/[slug]/episodes/[episodeNumber]`)

- No chapter-level player.
- Show compact CTA: story has audio companion; deep-link back to story page with audio anchor.

## Discover and `/me`

- Discover card can optionally show "Has Audio Companion" badge (story-level metadata).
- `/me` can surface "Continue Listening" (future phase) from `audio_listening_progress`.

## Read <-> Listen bridge (story-level only)

- Read -> Listen:
  - From story detail and chapter reader CTA, navigate to story-level audio list.
- Listen -> Read:
  - Global player item keeps `story_id`; "Read story" opens canonical story page `/@username` profile links remain unchanged.
- No chapter-sync assumptions; bridge is story context, not chapter context.

## Global Audio Player design

- Single app-level player store (client state + persistence key).
- Queue contains external audio items only.
- Queue order: current story parts ordered by `part_number`, `sort_order`.
- Primary controls: play/pause, next/prev part, seek, speed, mute, close.
- Background playback allowed only for external audio.
- No autoplay on app load; user-initiated playback only.

## YouTube playback design

- Render official YouTube iframe only for `youtube_embed`.
- No extraction to audio stream, no background playback via ChapMee player.
- No insertion into global queue.
- When navigating away, YouTube playback follows iframe lifecycle of page/container.

## Ads design for audio companion

- Ads only render if admin policy allows.
- Audio ads apply to story-level companion context only.
- For external background playback, do not refresh ads continuously in player.
- Event logging should separate:
  - `audio_companion_view`
  - `audio_companion_play`
  - `audio_companion_complete`
  - optional `audio_companion_ad_impression` (policy-gated)

## Broken link handling

- On save: lightweight URL syntax validation.
- Scheduled checker (future job):
  - HEAD/GET probe for external URL (safe timeout).
  - YouTube oEmbed/video-id validity probe.
- Update `broken_link_status` and `broken_link_checked_at`.
- Public UI hides or labels broken items per policy.

## Risks and constraints checklist

- External audio links may expire or be removed.
- YouTube must remain iframe-only; no audio-only extraction.
- YouTube must not be background-played by ChapMee global player.
- Audio must always bind to story text context.
- Audio must not bind to chapter.
- Ads must not refresh during continuous background listening.
