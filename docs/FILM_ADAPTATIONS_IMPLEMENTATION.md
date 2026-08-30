# Film Adaptations — Implementation Reference

Story-level YouTube film adaptations (Phim chuyển thể) for ChapMee MVP.

## Stack

| Layer | Location |
|-------|----------|
| Schema | `lib/db/schema/film-adaptations.ts`, `drizzle/0022_story_film_adaptations.sql` |
| Policy settings | `lib/settings/film-adaptation-settings.ts` → `app_settings.film_adaptation_policy_settings` |
| YouTube parse/embed | `src/lib/film-adaptations/youtube.ts` |
| Policy engine | `src/lib/film-adaptations/film-policy.ts` |
| Ads guard | `src/lib/film-adaptations/film-ads-guard.ts` |
| YouTube checker | `src/lib/film-adaptations/youtube-checker.ts` |
| CRUD service | `src/lib/film-adaptations/film-adaptations.ts` |
| Public data | `src/lib/film-adaptations/public-films.ts` |
| Studio | `app/studio/(workspace)/stories/[storyId]/films/` |
| Public UI | Discover `?tab=films`, story detail tab |
| Admin | `app/admin/film-adaptations/*`, `lib/admin/film-adaptations-admin.ts` |

## Ads

- **Policy:** `canShowAdsOnFilmAdaptation(story, film, settings)` in `film-policy.ts`.
- **Guard wrapper:** `resolveFilmCompanionAdContext`, `pickStoryFilmAdRepresentativeItem`, `shouldBlockFilmCompanionAdRefresh` in `film-ads-guard.ts`.
- **UI:** `components/films/FilmCompanionAdSlot.tsx` → `ChapMeeAdSlot` with placement key `story_film_section` (configure in Admin → Ads).
- **Defaults:** `youtube_embed_ads_on_film_pages_enabled: false`, translation unverified ads off unless admin enables `translated_story_film_ads_allowed_when_unverified`.
- **Safety:** No ads in Discover film grid; ad slot hidden when YouTube iframe open or document hidden; spacing below film grid (not beside player).

## YouTube checker

```bash
npx tsx scripts/check-film-youtube-links.ts          # dry-run (default)
npx tsx scripts/check-film-youtube-links.ts --apply
npx tsx scripts/check-film-youtube-links.ts --limit=50 --story-id=<uuid>
```

Optional oEmbed probe: set `FILM_YOUTUBE_OEMBED_PROBE=1` (lightweight GET to YouTube oEmbed; no video download).

## Validation

```bash
npx tsx scripts/validate-film-adaptations.ts
npx tsx scripts/validate-film-adaptations.ts --with-db
```

## MVP constraints (enforced)

- YouTube iframe only — no upload, proxy, rehost, ytdl, mp3 extraction.
- Story-level link only — no `chapter_id` column.
- `is_free` always true; no paid/coin UI.
- No background YouTube playback; no autoplay feature for films.
- Mobile bottom nav: 4 tabs (no film tab).
- Discover: thumbnails only; iframe on explicit “Xem phim”.

## Audit actions (admin)

`film_policy_update`, `film_publish`, `film_hide`, `film_reject`, `film_disable_ads`, `film_enable_ads`, `film_mark_unavailable`, `film_mark_copyright_disputed`, `film_mark_rights_verified`
