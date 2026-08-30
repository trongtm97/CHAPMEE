# Read ↔ Listen Bridge — Validation Report (Story-level only)

**Date:** 2026-06-02  
**Scope:** Story-level Audio Companion + Read ↔ Listen bridge (no chapter-level audio UI)  
**Method:** Static codebase audit, forbidden-pattern grep, `npm run build`

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| Story → Listen paths | **Pass** | Story detail CTAs, `#audio` tab, chapter reader story CTA |
| Listen → Story paths | **Pass** | Global mini/full player, audio cards use canonical `storyHref` |
| Story-level only | **Pass** | No public “Nghe chương này”; policy rejects `chapter_id` on audio input |
| External vs YouTube | **Pass** | External → `GlobalAudioPlayer`; YouTube → iframe only |
| Continuous queue | **Pass** | By `part_number` / `sort_order`, not chapter order |
| Discover/search badges | **Pass** | `StoryAudioBadge` on cards when published audio exists |
| Mobile mini player | **Pass** | `bottom-[calc(4.5rem+safe-area)]`, `z-40` |
| SEO headings | **Pass** | Single `h1` on `/audio`; audio UI uses `h2` or no heading |
| Global media mutual exclusion | **Pass** (fixed) | Coordinator event pauses YouTube when external plays |
| Guest progress restore in player | **Pass** | Server action + `localStorage`; seek on play / “Nghe tiếp” |
| Named “Global Media Coordinator” module | **Pass** | `src/lib/media/global-media-coordinator.ts` (lightweight) |

**Build:** `npm run build` — pass (see §12).

---

## 1. Surfaces audited

### 1.1 Story with external audio parts

| Check | Result |
|-------|--------|
| Story hero “Có audio” badge | Pass — `StoryHero` + `hasPublishedAudio` |
| Header CTA strip: Nghe truyện / Nghe từ đầu / Nghe tiếp | Pass — `StoryDetailPage` |
| Audio tab `#audio` | Pass — `StoryAudioSection` (`h2` “Audio”, not `h1`) |
| Part order | Pass — `part_number`, then `sort_order`, then `created_at` |
| External “Nghe” | Pass — `playAudioItem` / `playQueue` via `GlobalAudioProvider` |
| Continuous auto-advance | Pass — `handleEnded` + `isContinuousMode` + queue index |
| Links to text | Pass — “Đọc truyện”, “Mở truyện”, `storyHref` from `getStoryDetailHref` |

**Files:** `components/story/StoryDetailPage.tsx`, `src/components/audio/StoryAudioSection.tsx`, `src/lib/audio/audio-queue.ts`

### 1.2 Story with YouTube audio

| Check | Result |
|-------|--------|
| YouTube in GlobalAudioPlayer | **Fail by design** — correct; external URL required |
| YouTube UI | Pass — `YoutubeEmbedPlayer` iframe only (`rel=0`, no `autoplay=1`) |
| CTAs | Pass — “Nghe” (YouTube watch), “Đọc bản text”, “Mở truyện” → `readHref` (story) |
| Background / continuous badges on cards | Pass — continuous badge only for external queue (≥2 parts) |
| Pauses global player on interact | Pass — `onPointerDown` → `pause()` |

**Files:** `src/components/audio/YoutubeEmbedPlayer.tsx`, `src/components/audio/AudioItemCard.tsx`

### 1.3 Story without audio

| Check | Result |
|-------|--------|
| No audio tab | Pass — tab only if `publishedAudioItems.length > 0` |
| No reader CTA | Pass — `canShowStoryAudioCta` + empty queue |
| No card badge | Pass — `hasPublishedAudio` false |

### 1.4 Chapter reader (story with audio)

| Check | Result |
|-------|--------|
| Story-level CTA only | Pass — `StoryAudioCTABox`: “Truyện này có bản audio” |
| No per-chapter audio badge | Pass — `EpisodeListSheet` / `StoryChaptersTab` have no audio badges |
| Policy gate | Pass — `canShowStoryAudioCTAOnChapterReader` on episode page |
| Toolbar “Audio” link | Pass — to `{storyHref}#audio`, gated by `canShowStoryAudioCta` |
| No “Nghe chương này” | Pass — not present in codebase |

**Files:** `components/reader/StoryAudioCTABox.tsx`, `components/reader/ReaderPage.tsx`, `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`

### 1.5 Chapter reader (story without audio)

| Check | Result |
|-------|--------|
| No CTA box | Pass — `queue.length === 0` → null |
| No toolbar audio link | Pass — `canShowStoryAudioCta` false |

### 1.6 `/audio` landing

| Check | Result |
|-------|--------|
| Single `h1` | Pass — “Audio Truyện” in `app/audio/page.tsx` |
| Cards link to story | Pass — `item.story_href`, “Đọc truyện” / “Mở truyện” |
| Filters | Pass — origin, source, continuous, sort (no chapter filters) |
| Continue badge | Pass — “Tiếp tục” when logged-in progress exists |

### 1.7 Global mini / full player

| Check | Result |
|-------|--------|
| `storyHref` on queue items | Pass — set in `audio-queue.ts` via `getStoryDetailHref` |
| “Đọc truyện” | Pass — mini + full player |
| No “Đọc chương” | Pass |
| No chapter fields in store | Pass — `GlobalAudioQueueItem` has `storyId`, `storyHref` only |
| Mobile position | Pass — `bottom-[calc(4.5rem+env(safe-area-inset-bottom))]` |
| Desktop | Pass — bottom-right floating card |

**Files:** `src/components/audio/GlobalAudioMiniPlayer.tsx`, `src/components/audio/GlobalAudioFullPlayer.tsx`, `src/lib/audio/audio-player-store.ts`

### 1.8 Discover / search / profile / ranking cards

| Check | Result |
|-------|--------|
| “Có audio” badge | Pass — `StoryAudioBadge` + `audio-summary` enrichment |
| “Nghe liên tục” badge | Pass — external continuous queue only (not YouTube) |
| Discover quick link | Pass — “Truyện có audio” → `/audio` |
| Catalog filter | Pass — `/truyen?hasAudio=yes` |
| Policy toggles | Pass — `show_audio_badge_on_story_cards`, `show_continuous_playback_badge` |

### 1.9 Mobile / desktop viewports

| Check | Result |
|-------|--------|
| Bottom nav 4 tabs | Pass — Reels, Discover, Community, Me (`MobileBottomNav`) |
| Mini player above nav | Pass — offset ~4.5rem + safe area |
| No 5th tab for audio | Pass |

### 1.10 Progress (guest vs logged-in)

| Check | Result |
|-------|--------|
| Logged-in save | Pass — `saveAudioProgressAction` → `audio_listening_progress` |
| Logged-in continue on story | Pass — `getContinueListeningForStory`, “Nghe tiếp” on detail |
| `/me` continue block | Pass — `ContinueListeningAudioSection` |
| Guest save | Pass — `localStorage` via `getGuestProgressKey` on save failure |
| Guest/logged-in seek in global player | **Pass** — `getListeningProgressAction` + guest `localStorage`; seek on `loadedmetadata` |

---

## 2. Validation rules checklist

| Rule | Status |
|------|--------|
| No audio item without `story_id` (policy) | Pass — `assertStoryLevelAudioOnly`, `AUDIO_POLICY_REQUIRE_STORY_ID` |
| No public UI requires `chapter_id` | Pass |
| No “Nghe chương này” | Pass |
| No “Đọc chương” in audio UI | Pass (see §3 false positives) |
| Every audio card has story link | Pass |
| Global player state has story route | Pass — `storyHref` |
| External continuous by audio parts | Pass |
| Queue sort by part/sort_order | Pass |
| YouTube cannot start GlobalAudioPlayer | Pass — filtered in `playQueue` |
| YouTube iframe only | Pass |
| External + YouTube not together | Pass — coordinator + YouTube pauses global on interact |
| No ChapMee autoplay | Pass — `userInteractedRef` + no `autoplay=1` on embed URL |
| Mobile 4 tabs | Pass |
| Mini player not covering nav | Pass |
| `/audio` one h1 | Pass |
| Story/chapter pages no extra h1 from audio | Pass — audio section uses `h2` |
| No paid/coin audio UI | Pass — no coin UI in `src/components/audio` |
| Unpublished not public | Pass — `status === 'published'` filters |

---

## 3. Forbidden pattern search

### 3.1 Chapter-level / forbidden audio UI strings

```text
grep -R "Nghe chương này|Đọc chương|chapter_id.*audio|chapterAudio|buildQueueFromChapter|auto_play_next_chapter|max_audio_items_per_chapter|allow_chapter_level_audio"
```

| Match | Verdict |
|-------|---------|
| `scripts/validate-audio-companion.ts` | **False positive** — validation script patterns |
| `scripts/test-audio-policy-url.ts` | **False positive** — policy test |
| `lib/seo/content-hub-seo-data.ts` — “Đọc chương {n}” | **False positive** — SEO for text chapter pages, not audio UI |
| `lib/stories/story-structure.ts` — “Đọc chương đầu” | **False positive** — text reading CTA on story cards |
| `components/admin/algorithm/RankingAdminDashboard.tsx` — “Đọc chương tiếp” | **False positive** — ranking admin metric label |
| `types/ads.ts` — placement `chapter_reader` | **False positive** — ad surface name |
| `src/lib/audio/audio-items.ts` — `chapter_id?` on row type | **False positive** — DB legacy field; policy forbids use |
| `show_story_audio_cta_on_chapter_reader` setting key | **False positive** — means CTA on reader page, not chapter-level audio |

**Runtime audio UI:** no forbidden matches.

### 3.2 Media safety search

```text
grep -R "youtube.*mp3|ytdl|download.*youtube|proxy.*audio|audio-only|autoplay|background.*youtube"
```

| Match | Verdict |
|-------|---------|
| `canAutoPlayNextAudioPart` | **False positive** — auto-advance **audio part** in queue, not page autoplay |
| `autoplay_audio_enabled` policy (default false) | **False positive** — admin setting, default off |
| `background_audio_youtube_enabled` (default false) | **False positive** — policy flag |
| `YoutubeEmbedPlayer` iframe `allow` list | **False positive** — removed `autoplay` from allow list in this audit; URL has no autoplay param |
| Film policy `AUDIO_ONLY_FORBIDDEN` strings | **False positive** — rejection messages |
| `scripts/validate-*.ts` | **False positive** — validators |

**No ytdl, mp3 rip, proxy audio, or audio-only routes in app code.**

---

## 4. Global Media Coordinator

**Before audit:** YouTube paused global player on pointer-down; starting external audio did not stop an already-playing YouTube iframe.

**Fix applied:**

- `src/lib/media/global-media-coordinator.ts` — `pauseEmbeddedMedia()` / `subscribeEmbeddedMediaPause()`
- `GlobalAudioProvider` calls `pauseEmbeddedMedia()` on `playAudioItem` and `resume`
- `YoutubeEmbedPlayer` remounts iframe on event (stops playback)
- `YoutubeFilmEmbed` same pattern for film tab consistency

**Not implemented:** Full coordinator registry for reels/video (out of audio scope). YouTube cannot programmatically pause from parent without remount/postMessage — remount is acceptable for story-level scope.

---

## 5. Issues found and disposition

| ID | Severity | Issue | Action |
|----|----------|-------|--------|
| RLB-01 | Medium | External play did not stop YouTube iframe | **Fixed** — global-media-coordinator |
| RLB-02 | Low | Guest progress saved but not restored on global play | **Fixed** — `readGuestAudioProgress` + seek in player |
| RLB-03 | Low | “Nghe tiếp” starts correct part but not saved timestamp | **Fixed** — `getListeningProgressAction` + `fromBeginning` flag |
| RLB-04 | Info | No `ManagedYoutubeEmbed` component name | **N/A** — `YoutubeEmbedPlayer` + `YoutubeFilmEmbed` are canonical |
| RLB-05 | Info | `ManagedYoutubeEmbed` mentioned in prompt | Documented; films use `YoutubeFilmEmbed` |

---

## 6. Manual QA script (recommended)

1. Open a story with 2+ external audio parts → **Nghe từ đầu** → confirm part 1, then auto or **Tiếp** to part 2.
2. Full player → **Đọc truyện** → canonical story URL (slug + public code).
3. Chapter reader → only story-level CTA; no chapter audio badges.
4. `/audio` → each card has **Đọc truyện**; logged-in user sees **Tiếp tục** if in progress.
5. YouTube story → iframe only; **Nghe** opens YouTube; no global mini player for YouTube.
6. Play external → start YouTube iframe → external should have paused YouTube (after fix).
7. Play YouTube → start external → YouTube iframe remounts/stops.
8. Mobile: mini player sits above 4-tab bottom nav.

---

## 7. Related docs

- Design: `docs/READ_LISTEN_BRIDGE_DESIGN.md`
- Audio policy: `docs/AUDIO_COMPANION_POLICY.md`
- Audio validation (companion): `docs/AUDIO_COMPANION_VALIDATION_REPORT.md`

---

## 8. Files touched in this audit (fixes only)

- `src/lib/media/global-media-coordinator.ts` (new)
- `src/lib/audio/audio-player-progress.ts` (new — guest resume helpers + guest completed)
- `src/lib/audio/audio-progress-events.ts` (new)
- `src/hooks/useStoryAudioClientProgress.ts` (new)
- `app/actions/audio-items.ts` — `getListeningProgressAction`
- `src/components/audio/GlobalAudioProvider.tsx` — resume seek + guest completed sync + coordinator
- `src/components/audio/YoutubeEmbedPlayer.tsx`
- `components/films/YoutubeFilmEmbed.tsx`
- `components/story/StoryDetailPage.tsx`, `src/components/audio/StoryAudioSection.tsx` — `Nghe từ đầu` passes `fromBeginning`
- `src/components/audio/AudioItemCard.tsx` — guest continue badge fallback
- `components/reader/StoryAudioCTABox.tsx` — guest continue fallback
- `components/me/tabs/ReadingTab.tsx` — show continue listening block
- `package.json` — `test:read-listen-bridge`
- `docs/READ_LISTEN_BRIDGE_VALIDATION_REPORT.md` (this file)

---

## 9. Follow-up (optional, not blocking release)

1. **E2E Playwright** — coordinator + continuous queue + resume seek (manual QA script in §6 is sufficient for MVP).
2. **Guest “Đã nghe xong”** on story audio tab — ✅ implemented via `localStorage` fallback + client sync hook; keep monitoring with manual QA.

**Implemented after initial audit**

- YouTube `enablejsapi=1` + `postMessage` pause before iframe remount (`global-media-coordinator`).
- `scripts/validate-read-listen-bridge.ts` — static checks runnable in CI.
- Story audio tab badge **Đã nghe xong** for completed parts (logged-in + guest localStorage).
- Guest continue/completed via `useStoryAudioClientProgress` on story detail hero, audio tab, reader CTA, `/audio` cards.
- `npm run test:read-listen-bridge` script in `package.json`.

---

## 10. Build result

```bash
npm run build
# 2026-06-02 — Next.js 16.2.6 — compiled successfully, TypeScript OK, 148 static pages OK

npm run test:read-listen-bridge
# 9/9 passed
```

`pnpm` was not required for this run; use `npm run build` or `pnpm build` interchangeably if `pnpm` is on PATH.
