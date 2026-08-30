# Film Adaptations — Validation Report

Generated as part of PROMPT 7 (ads guard, YouTube checker, validation scripts, UX audit).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/check-film-youtube-links.ts` | Dry-run / `--apply` YouTube link health |
| `scripts/validate-film-adaptations.ts` | Static + optional `--with-db` policy checks |

## Static checks (`validate-film-adaptations.ts`)

- Policy defaults: paid/coin off, chapter linking off, embed ads off by default.
- `canShowAdsOnFilmAdaptation` blocks unverified translation ads by default.
- Discover cards: default CTA `Đọc truyện` + `storyHref`.
- Story film section: empty → `null`.
- Discover films tab: no mass `<iframe>`.
- Mobile nav: exactly 4 tabs.
- Schema: no `chapter_id` on `story_film_adaptations`.
- Forbidden pattern scan (mp3/ytdl/proxy/rehost/audio-only/standalone `/films/` route).

## DB checks (`--with-db`)

- No film without `story_id`.
- No published film on unpublished/non-public story.
- No `is_free = false`.
- YouTube rows have `video_id` or `playlist_id` per embed type.
- Translation unverified + `ads_allowed` only if policy explicitly allows.

## UX audit

| Requirement | Status |
|-------------|--------|
| Discover tab story links (“Đọc truyện”) | OK — `FilmAdaptationCard` |
| Story detail film bridge | OK — tab when published films exist |
| No standalone video-only route | OK — no `app/films/[id]` |
| Mobile 4 tabs | OK — `MobileBottomNav` |
| No iframe mass render in Discover | OK — thumbnail until “Xem phim” |
| Ads away from YouTube player | OK — `FilmCompanionAdSlot` below grid; hidden when player open |
| No ads in Discover list | OK — no ad slot in `DiscoverFeed` films grid |

## Forbidden search

Run:

```bash
rg -n "youtube.*mp3|ytdl|download.*youtube|proxy.*youtube|rehost.*youtube|audio-only|background.*youtube|autoplay|chapter_id.*film" src app components lib scripts
```

Expected: only policy/error strings, iframe `allow` attribute lists, or validation allowlists — not product features violating MVP.

## How to re-validate locally

```bash
npx tsx scripts/validate-film-adaptations.ts
npx tsx scripts/check-film-youtube-links.ts
npm run build
```

Record outputs in CI or release notes when shipping film MVP.
