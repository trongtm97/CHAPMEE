# Phim chuyển thể — Kế hoạch triển khai

**Trạng thái:** Thiết kế (PROMPT 1)  
**Prerequisite docs:** `FILM_ADAPTATIONS_ARCHITECTURE.md`, `FILM_ADAPTATIONS_POLICY.md`

---

## 1. Tóm tắt audit

| Khu vực | Hiện trạng | Hành động |
|---------|------------|-----------|
| Discover | Single feed, quick access grid, no films tab | Thêm `?tab=films` + `FilmDiscoverView` |
| Story detail | Tab Audio + `StoryAudioSection` | Thêm tab Phim + `StoryFilmSection` |
| Studio | `/studio/stories/[id]/audio` | Thêm `/films` workspace |
| Admin | Audio Center pattern | `/admin/films` + policy + review |
| YouTube | `audio-url.ts`, `YoutubeEmbedPlayer` | Extract shared + film policy |
| Schema | `audio_items` only | Migration `story_film_adaptations` |
| Mobile nav | 4 tabs — OK | Không đổi |
| Phim feature | **Không tồn tại** | Build theo phases dưới |

---

## 2. Nguyên tắc triển khai

1. **Không Supabase mới** — dùng PostgreSQL + Drizzle migration (local-first).
2. **Không rewrite app** — incremental modules.
3. **Feature flag** — `films_enabled: false` until phase 3 UAT.
4. **Build pass** mỗi phase — `pnpm build` CI.
5. **Tách khỏi Audio** — không mở rộng `audio_items`.

---

## 3. Phases

### Phase 0 — Foundation (PROMPT 2 recommended)

**Mục tiêu:** Schema + policy + shared YouTube utils, no public UI.

| Task | Output |
|------|--------|
| Migration `story_film_adaptations` | SQL + Drizzle schema |
| `lib/settings/film-adaptation-policy-settings.ts` | Zod + defaults |
| `src/lib/film/film-policy.ts` | Assertions |
| `lib/media/youtube-url.ts` | Move/share from `audio-url.ts` |
| `app/actions/film-adaptations.ts` | CRUD server actions (staff/creator) |
| Seed `app_settings` key | `film_adaptation_policy_settings` |
| Unit tests | Policy + URL parser |

**Exit:** `pnpm build` pass; no user-facing routes.

---

### Phase 1 — Studio + Admin

**Mục tiêu:** Creator/admin có thể quản lý phim; chưa public Discover.

| Task | Output |
|------|--------|
| `app/studio/.../films/page.tsx` | `StudioFilmWorkspace` |
| `components/studio/film/*` | Form, list (YouTube only) |
| `app/admin/films/page.tsx` | Paginated list |
| `app/admin/films/review/page.tsx` | Queue |
| `app/admin/films/policy/page.tsx` | Policy form |
| `lib/admin/film-admin.ts` | List/moderate |
| Audit actions | `film_*` in `log-admin-action` |
| Broken link job | Optional cron script |

**Exit:** Admin approve → `published`; story chưa hiện tab public.

---

### Phase 2 — Story bridge (public)

**Mục tiêu:** Truyện ↔ Phim trên story detail.

| Task | Output |
|------|--------|
| `getPublicStoryFilms(storyId)` | Server query |
| `StoryFilmSection` + `FilmCard` compact | iframe click-to-load |
| `StoryDetailPage` tab `films` | Conditional |
| `StoryHero` badge “Có phim chuyển thể” | Policy toggle |
| `app/stories/[slug]/page.tsx` | Load film data |
| SEO | `h2` panel; no extra `h1` |

**Exit:** User đọc truyện → xem phim trên cùng story; deep link `?tab=films`.

---

### Phase 3 — Discover tab

**Mục tiêu:** Tab “Phim chuyển thể” trong Khám phá.

| Task | Output |
|------|--------|
| Discover tab switcher | `?tab=films` |
| `lib/discover/get-discover-films.ts` | Paginated |
| `FilmDiscoverView` + grid cards | Full `FilmCard` |
| `DiscoverQuickAccessGrid` tile | Optional shortcut |
| `generateMetadata` discover films | Title/description |
| Ads placement | `discover_films_in_feed` (policy off default) |
| `films_enabled` true | Staged prod |

**Exit:** Discover tab live; mobile nav vẫn 4 tabs.

---

### Phase 4 — Hardening & legal

| Task | Output |
|------|--------|
| Content Policy page section | `/content-policy` |
| Report flow “Video vi phạm” | Reuse moderation |
| Rate limits / anti-spam | Creator daily cap |
| Analytics events | `film_impression`, `film_embed_play` |
| SEO audit | Update `SEO_HEADING_STANDARD.md` row |
| Load test embed | CLS/lazy-load verify |

---

## 4. Recommended prompts (next)

| Prompt | Scope |
|--------|--------|
| **PROMPT 2** | Phase 0: migration, schema, policy settings, film-policy engine, actions (no UI) |
| **PROMPT 3** | Phase 1: Studio films + Admin films/review/policy |
| **PROMPT 4** | Phase 2: Story detail tab + public queries + FilmCard |
| **PROMPT 5** | Phase 3: Discover `?tab=films` + metadata + quick access tile |
| **PROMPT 6** | Phase 4: Legal copy, reporting, analytics, broken-link cron |

---

## 5. Testing plan (per phase)

### Phase 0
- [ ] Insert film without `story_id` fails
- [ ] Payload with `chapter_id` fails
- [ ] Invalid YouTube URL rejected
- [ ] `pnpm build`

### Phase 1
- [ ] Creator adds film → `pending_review`
- [ ] Admin approve → `published`
- [ ] Pagination admin list > 20 items
- [ ] Policy toggle disables studio

### Phase 2
- [ ] Story without films: no tab
- [ ] Story with films: tab + iframe loads on click
- [ ] CTAs: Xem phim, Đọc truyện
- [ ] Disclaimer visible
- [ ] No Global Audio Player invoked

### Phase 3
- [ ] `/discover?tab=films` paginated
- [ ] Mobile bottom nav still 4 items
- [ ] No `/film/[id]` route
- [ ] Empty state when no films

### Phase 4
- [ ] Report hides film
- [ ] Broken video auto-hidden
- [ ] Ads off near iframe (default)

---

## 6. Migration & ops notes

### 6.1 Database

```bash
# Example (adjust to project migration tool)
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 6.2 `app_settings`

Insert default JSON for `film_adaptation_policy_settings` with `films_enabled: false`.

### 6.3 Production VPS

- Không cần bucket MinIO mới cho phim.
- PostgreSQL backup includes new table.
- Cron worker for link checks (same host as audio broken-link job nếu có).

### 6.4 Supabase deprecation note

Hiện `fetchAppSettingByKey` nằm dưới `lib/data/app-settings` — film settings nên dùng **cùng abstraction** đang migrate sang local PG (không thêm Supabase dependency mới).

---

## 7. Component checklist (implementation)

| Component | Phase |
|-----------|-------|
| `FilmCard` | 2–3 |
| `StoryFilmSection` | 2 |
| `FilmEmbedPlayer` | 2 (fork `YoutubeEmbedPlayer`) |
| `DiscoverFilmsTab` | 3 |
| `StudioFilmForm` | 1 |
| `AdminFilmTable` | 1 |
| `FilmPolicyForm` | 1 |

---

## 8. Routes summary (target)

| Route | Public | Notes |
|-------|--------|-------|
| `/discover?tab=films` | Yes | Main discovery |
| `/truyen/{segment}?tab=films` | Yes | Story bridge |
| `/studio/stories/{id}/films` | Creator | Management |
| `/admin/films` | Staff | List |
| `/admin/films/review` | Staff | Queue |
| `/admin/films/policy` | Staff | Settings |
| `/film/{id}` | **No** | Forbidden |

---

## 9. Rollback

1. Set `films_enabled: false` in admin policy → hides UI tabs.
2. Existing rows remain DB; no public query when disabled.
3. Migration rollback script drop table only if zero production data.

---

## 10. Success metrics (post-launch)

- Films published / active stories ratio
- Click-through: film card → story read
- Broken link rate < 5%
- Moderation queue SLA
- Zero incidents: rehost/proxy/download

---

## 11. Validation run (PROMPT 1)

| Step | Status |
|------|--------|
| git status | Docs only (no schema change this prompt) |
| Audit modules | See ARCHITECTURE §10 |
| Create 3 docs | Done |
| `pnpm build` | Run after docs |
| Report | See parent chat summary |

---

## 12. Out of scope (explicit)

- Paid films / coin unlock
- Chapter-level films
- Non-YouTube sources (Vimeo, TikTok, self-upload)
- Mobile 5th tab
- Standalone `/film` pages
- Background / PiP ChapMee-controlled playback
- Supabase new project
