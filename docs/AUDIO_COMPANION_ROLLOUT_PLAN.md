# Audio Companion Rollout Plan (Story-Level Only)

## Delivery principles

- Additive rollout, no large runtime rewrite.
- Keep build green at every phase.
- Story-level only (`story_id` required, no `chapter_id` in audio domain).
- Respect source split:
  - External audio -> global/background path.
  - YouTube -> iframe local path.

## Phase 0 - Audit and design (current)

- Complete architecture/policy/playback docs.
- Inventory existing modules and integration points.
- Confirm non-goals and constraints in writing.

Exit criteria:
- 4 docs present and aligned with constraints.

## Phase 1 - Schema and settings foundation

Scope:
- Add `audio_items` table (story-level, no chapter link).
- Add `audio_listening_progress` table (story/audio keyed).
- Add app-setting payload `audio_companion_policy_settings`.

Out of scope:
- No player runtime yet.
- No large UI changes.

Validation:
- Migration applies locally.
- Constraints reject chapter-linked or paid-audio style payloads.

## Phase 2 - Studio CRUD + admin policy

Scope:
- Studio story form gets audio companion part management.
- Validation + normalization for external and YouTube links.
- Admin settings page to control feature/source/ads/thresholds.
- Admin list pages use pagination for large datasets.
- Audit log entries for policy and moderation actions.

Validation:
- Creator can add/reorder/hide parts per story.
- Policy toggles instantly affect create/update permissions.
- Admin list performance remains stable with pagination.

## Phase 3 - Public story UI + Read<->Listen bridge

Scope:
- Story page renders companion audio section with source split.
- Reader chapter page adds soft CTA "story has audio companion" only.
- Discover badge and minimal /me entry points (story-level context).

Validation:
- Read -> Listen path works from story and chapter routes.
- Listen -> Read path opens story route.
- No chapter-level playback UI introduced.

## Phase 4 - External global player + queue + media session

Scope:
- Implement Global Audio Player for external audio only.
- Queue ordering by `part_number/sort_order`.
- App-level persistence across route changes.
- Media Session API integration for external path only.
- Progress API and throttled persistence.

Validation:
- Background playback works for external items.
- Queue auto-advances by part order.
- Progress persists/resumes correctly.
- No autoplay on app load.

## Phase 5 - YouTube iframe path + guardrails

Scope:
- Render YouTube via official iframe only in local story context.
- Explicitly block insertion into global player/queue.
- Explicitly disable ChapMee-driven background playback for YouTube.

Validation:
- YouTube item plays in-page only.
- Navigating away does not continue via global player.
- No extraction/proxy/rehost behavior.

## Phase 6 - Ads policy + broken link operations

Scope:
- Policy-gated audio ad display rules.
- Ensure no ad refresh loop during external background playback.
- Add broken-link checker workflow and moderation UI.

Validation:
- Ads appear only under allowed policy.
- Background playback does not refresh ads repeatedly.
- Broken items are surfaced to admin and handled by policy.

## Phase 7 - Hardening and launch

Scope:
- Telemetry dashboard for audio events.
- Error budget and rollback toggles.
- Final QA matrix for web/PWA/mobile browsers.

Validation:
- Build/lint/typecheck pass.
- No regression on story/chapter monetization and existing reader behavior.
- Rollback path tested via global disable setting.

## Integration map (existing modules)

- Story/read surfaces:
  - `app/stories/[slug]/page.tsx`
  - `components/story/StoryDetailPage.tsx`
  - `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
  - `components/reader/ReaderPage.tsx`
- Studio:
  - `components/studio/stories/StudioStoryForm.tsx`
  - `lib/creator/createStory.ts`
  - `lib/creator/updateStory.ts`
- Admin/settings/audit:
  - `lib/settings/content-origin-policy-settings.ts`
  - `lib/content-origin/content-origin-policy.ts`
  - `lib/admin/content-origin-admin.ts`
  - `lib/audit/log-admin-action.ts`
  - `app/admin/audit/page.tsx`
- Ads:
  - `components/ads/ChapMeeAdSlot.tsx`
  - `app/api/ads/events/route.ts`
- Discover and /me:
  - `app/discover/page.tsx`
  - `components/discover/DiscoverFeed.tsx`
  - `app/me/page.tsx`

## Risk register

- External links can break/expire; requires recurring health checks.
- YouTube embed policy/availability can change externally.
- Accidental coupling to chapter monetization is possible if API contracts are not strict.
- Background playback may create UX confusion with ad surfaces unless policy is explicit.
- Queue/progress race conditions across tabs/devices need defensive upsert logic.

## Rollback strategy

- Global toggle `audio_companion_policy_settings.enabled = false` disables public/studio rendering.
- Keep schema additive; no destructive migration needed for rollback.
- Player can be disabled while preserving stored items/progress for future re-enable.

## Build and release gate

- Required pre-merge checks:
  - `pnpm lint`
  - `pnpm build`
  - focused tests for policy validation + queue ordering + progress upsert
- Release only when all gates pass and no regression on existing chapter reader flow.
