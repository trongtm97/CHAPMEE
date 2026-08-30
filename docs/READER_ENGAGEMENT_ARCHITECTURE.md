# Reader Engagement & Content Protection — Architecture (Audit)

**Status:** Design / audit only (Prompt 1). No runtime implementation in this pass.  
**Product:** ChapMee — text/story platform (Next.js, TypeScript, Tailwind, PWA).  
**Infra direction:** Local-first PostgreSQL + MinIO; production VPS + self-managed Postgres + S3-compatible storage. No Supabase as a product dependency (codebase still uses `lib/data/*` data client shims during migration).

---

## Admin Engagement Center (Prompt 7 — implemented)

| Route | Purpose |
|-------|---------|
| `/admin/engagement` | Overview cards (reactions, reviews, inline, boosts, security) + quick links |
| `/admin/engagement/reactions` | Catalog table: emoji, key, label, enabled, sort, `updated_at`; audit on save |
| `/admin/engagement/reviews` | Paginated moderation: status, reported, rating, story/user search |
| `/admin/engagement/inline-comments` | Thread-level queue: orphan/reported filters, hide/resolve/restore |
| `/admin/engagement/boosts` | Boost settings + ledger insights (`/admin/engagement/boost` redirects) |
| `/admin/security/crawl-protection` | Crawl settings + paginated `security_events` |

**Shared modules:** `lib/admin/engagement-admin.ts`, `lib/admin/admin-list-params.ts`, `components/admin/engagement/*`.

**Guards:** `requireAdminSettingsAccess` or `requireAnyPermission` (`report.review`, `moderation.action.create`). Admin layout sets `noindex` robots.

---

## Phase 1 — Chapter reactions (implemented)

| Item | Location |
|------|----------|
| Migration | `drizzle/0012_chapter_reaction_catalog.sql` |
| Drizzle schema | `lib/db/schema/chapter-reactions.ts` |
| Server logic | `lib/reactions/chapter-reactions.ts` |
| Server actions | `lib/reactions/chapter-reaction-actions.ts` |
| Reader UI | `components/reader/ChapterReactions.tsx` |
| Admin UI | `app/admin/engagement/reactions/page.tsx` |

**Behavior:** Multi-select toggle per reaction type; counts use `visibleCount` (all origins) with `realCount` excluding `admin_seed`/`system_seed`; catalog seeded in DB and editable in admin.

**Recommended next prompt:** Structured reviews (Phase 2) per `docs/STRUCTURED_REVIEWS_PLAN.md`.

---

## 1. Executive summary

| Feature area | Current state | Gap |
|--------------|---------------|-----|
| Chapter comments | Episode-level thread, max 30, end-of-chapter UI | No inline / paragraph-anchored comments |
| Chapter reactions | `chapter_reactions` table + `ReaderReactionPanel` | Types hardcoded in DB CHECK + TS; not admin-driven |
| Structured reviews | None for stories | Need multi-axis 1–5 + text, one per user/story |
| Story boost / đề cử | None (only `admin_boost` feed pool) | Need capped, decaying, ledger-backed boosts |
| Anti-crawl | Rate limits on writes; SSR chapter body; robots disallow `/api/` | No signed content API, Turnstile, or bot scoring |

Recommended rollout: **reactions config → structured reviews → inline comments → story boost → content protection hardening**, with anti-abuse rules applied in every phase.

---

## 2. Current state

### 2.1 Reader / chapter page

| Concern | Implementation |
|---------|----------------|
| Route | `app/stories/[slug]/episodes/[episodeNumber]/page.tsx` (`dynamic = "force-dynamic"`) |
| Layout shell | `components/reader/ReaderPage.tsx`, `ReaderLayout.tsx`, mobile bottom bar, desktop comment sidebar |
| Content render | `PresentationReaderContentWithAds` → composer/prose blocks; `ReaderContent` for simple prose |
| Full body load | `getEpisodeReaderData` → optional `hydrateEpisodeReaderBody` when S3-backed and not locked |
| Paid / early access | `getPaidChapterReaderState`, `getEarlyAccessReaderState` — preview text only when locked |
| Reactions | `getChapterReactionView` + `ReaderReactionPanel` (end of chapter) |
| Comments | `getComments({ storyId, episodeId })` — flat list, no anchors |
| SEO | `buildPublicEpisodeMetadata`, `shouldIndexEpisode`, JSON-LD breadcrumbs/article |
| Analytics | `ReaderAnalyticsTracker`, `persistReadingProgress`, monetization gate events |

**Chapter content storage (hybrid):** See `docs/CHAPTER_CONTENT_STORAGE_PLAN.md`.

- Columns on `episodes`: `content_storage_type`, `content_object_key`, `plain_text_preview`, `content_hash`, etc. (`drizzle/0008_episode_content_object_storage.sql`).
- Server resolver: `lib/chapters/get-chapter-full-content.ts` — DB inline vs MinIO/S3 with `allowS3Fetch: false` for unauthorized/preview paths.
- **No public REST API** that returns full chapter JSON; content is embedded in SSR HTML for authorized readers.

### 2.2 Comment system

| Layer | Path / table |
|-------|----------------|
| Schema | `public.comments` — `story_id`, `episode_id`, `parent_id`, `community_post_id`, `status`, `is_pinned` (migrations after `001_initial_schema.sql`) |
| Create | `lib/comments/createComment.ts` — auth, `comment.create` permission, spam heuristics, rate limit, notifications, fan score |
| Read (chapter) | `lib/comments/getComments.ts` — `.limit(30)`, `episode_id` filter, newest first |
| UI | `ChapterCommentsPanel`, `ChapterCommentsSheet`, `CommentForm`, `CommentList` |
| Studio | `app/studio/(workspace)/comments/page.tsx`, hide/unhide/pin actions |
| Likes | `lib/comments/toggleCommentLike.ts` via generic `reactions` (`target_type = 'comment'`) |
| Reports | `lib/reports/createReport.ts` — `comment` in `ReportTargetType` |

**Not present:** paragraph offsets, block IDs, quote text, thread-per-selection, or orphan repair.

### 2.3 Reactions

| Layer | Detail |
|-------|--------|
| Table | `chapter_reactions` — unique `(chapter_id, user_id)`, `reaction_key` CHECK with 8 fixed keys (`db/migrations/legacy/018_chapter_reactions.sql`) |
| Server | `lib/data/reactions.ts` — `getChapterReactionView`, `reactToChapter` (upsert + fan score) |
| Types | `types/reaction.ts` — `CHAPTER_REACTION_OPTIONS` |
| Reader UI subset | `lib/reader/reader-reaction-options.ts` — primary/secondary keys (labels partially overridden) |
| Action | `lib/reader/reader-reaction-actions.ts` → server action → redirect |

Product-requested reaction set (haha, wow, phẫn nộ, khóc, cuốn, muốn chương tiếp, thích) **partially overlaps** current keys (`hai`, `soc`, `tuc`, `buon`, `cuon`, `muon_chap_tiep`) but is **not identical** and **not admin-configurable**.

### 2.4 Reviews / ratings

- **No** `story_reviews` or multi-axis rating tables found.
- `types/community.ts` includes post type `"review"` for **community posts**, not structured story reviews.
- Story detail may show engagement counts from analytics/comments; no dedicated review tab on public story pages in reader scope.

### 2.5 Rankings (BXH)

| Layer | Detail |
|-------|--------|
| Snapshots | `ranking_snapshots` — board types in `types/ranking-board.ts` (`top_stories`, `rising_stories`, …) |
| Generation | `lib/ranking/generate-snapshots.ts` — uses `computeRankingScore` + `loadRankingWeights()` from **algorithm_settings** |
| Public UI | `app/rankings/page.tsx`, `app/bang-xep-hang/page.tsx`, `lib/ranking/get-board.ts` (paginated, `RANKING_PAGE_SIZE = 20`) |
| Legacy scoring | `lib/ranking/storyRanking.ts` — event-weight MVP (TODO: anti-fraud) |
| Feed editorial boost | `types/feed-mixer.ts` pool `admin_boost` — **not** user-funded |

**No** user “đề cử” / story boost ledger or separate “Được đề cử” chart.

### 2.6 Coins / wallet / points

| Layer | Detail |
|-------|--------|
| Wallets | `user_wallets` (`db/migrations/legacy/028_wallets_and_transactions_ledger.sql`) |
| Ledger | `transactions` + `lib/transactions/ledger.ts` |
| Admin coins | `lib/admin/grant-coin-to-user.ts`, `/admin/coins` |
| Reader monetization | Paid chapters, tips, rewarded ads — not boost |

**No** `reward_points` table; boost should integrate with **transactions** + optional future points currency via admin settings.

### 2.7 Admin settings & audit

| System | Tables / modules |
|--------|------------------|
| Algorithm / ranking weights | `algorithm_settings`, `algorithm_setting_audit_logs` — `lib/algorithm/settings.ts` |
| General admin audit | `admin_audit_logs` — `lib/audit/log-admin-action.ts` |
| Monetization toggles | `lib/data/monetization-settings.ts`, admin monetization panels |
| Footer / app settings | `lib/admin/footer-settings-actions.ts` pattern |

**Pattern to reuse:** keyed settings + `updated_by` + audit log row on change; no hard-coded weights in application code for boost/ranking.

### 2.8 Auth, rate limits, security

| Mechanism | Location |
|-----------|----------|
| Session user | `lib/auth/getCurrentUser.ts`, `get-session-user.ts` (migration in progress) |
| Action permissions | `lib/auth/assert-action-access.ts` |
| Rate limits | `lib/rate-limit.ts` → `rate_limit_events` (comment, reply, report, tip, …) |
| Restrictions | `lib/moderation/check-restriction.ts` (`comment_block`, etc.) |
| Turnstile / bot ML | **Not found** |
| Signed chapter tokens | **Not found** |
| Content API | `/api/chapter-images/*`, `/api/media/*` — media only, not prose body |

### 2.9 Media resolver

- `media_assets` (view over `storage_assets` per `drizzle/0000_foundation.sql` comment).
- `lib/media/media-url.ts` — `resolveMediaAssets`, stable `mediaAssetId` / object keys server-side.
- Chapter images: `lib/images/get-chapter-images-map.ts`, upload/resolve API routes.
- **Rule:** Do not expose raw `content_object_key` or private bucket URLs to the client for paid content.

### 2.9 SEO / crawl

- `lib/seo/robots-config.ts` — allows public discovery routes; **disallows** `/api/`, `/studio/`, `/me/`, legacy `/u/`, etc.
- Episode indexing: `lib/seo/should-index.ts`, `buildPublicEpisodeMetadata`.
- **No cloaking** detected; public chapters render full text in HTML for Google when indexable and unlocked.
- Risk: bulk SSR scraping of public chapters is possible today (no per-IP chapter rate limit on page route).

### 2.10 Fake / seed engagement (critical)

| Source | Risk |
|--------|------|
| Composer blocks `fake_like_count`, `fake_comment_count` | Presentation-only; **must never** write to `comments`, `reactions`, or ranking metrics (`lib/composer/schema.ts`, `to-legacy-presentation.ts`) |
| `admin_boost` feed pool | Editorial; label separately in explainability; not user votes |
| Cold start | `lib/cold-start/*` — test/exposure system; must not count as organic engagement in ranking inputs |
| Milestone / fan score | Real user actions only today for reactions/comments |

**Product rule:** All new engagement tables need `engagement_source` / `is_counted_in_ranking` flags; seed/system rows default `false` for ranking aggregates.

---

## 3. Existing files / modules (reference index)

### Reader

- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
- `components/reader/ReaderPage.tsx`, `ReaderReactionPanel.tsx`, `ChapterCommentsPanel.tsx`, `ChapterCommentsSheet.tsx`
- `lib/episodes/getEpisodeReaderData.ts`, `lib/chapters/get-chapter-full-content.ts`, `lib/chapters/hydrate-episode-reader-body.ts`

### Comments

- `lib/comments/createComment.ts`, `getComments.ts`, `getCommentThread.ts`, `deleteComment.ts`, `hide-comment.ts`, `pin-comment.ts`
- `components/comments/CommentForm.tsx`, `CommentList.tsx`

### Reactions

- `lib/data/reactions.ts`, `types/reaction.ts`, `lib/reader/reader-reaction-options.ts`, `lib/reader/reader-reaction-actions.ts`
- `db/migrations/legacy/018_chapter_reactions.sql`

### Rankings

- `lib/ranking/generate-snapshots.ts`, `get-board.ts`, `score-formula.ts`, `eligible-content.ts`
- `app/rankings/page.tsx`, `components/rankings/*`
- `lib/algorithm/settings.ts`, `lib/scoring/config.ts`

### Monetization / ledger

- `lib/transactions/ledger.ts`, `lib/monetization/paid-chapters.ts`, `lib/coins/*`
- `db/migrations/legacy/028_wallets_and_transactions_ledger.sql`

### Protection / limits

- `lib/rate-limit.ts`, `lib/reports/createReport.ts`
- `lib/seo/robots-config.ts`, `lib/seo/build-metadata.ts`

### Related plans

- `docs/CHAPTER_CONTENT_STORAGE_PLAN.md`
- `docs/STORAGE_ARCHITECTURE_AUDIT.md`

---

## 4. Proposed modules (high level)

| Module | Doc |
|--------|-----|
| Inline comments | `docs/INLINE_COMMENTS_PLAN.md` |
| Structured reviews | `docs/STRUCTURED_REVIEWS_PLAN.md` |
| Story boost & ranking | `docs/STORY_BOOST_AND_RANKING_PLAN.md` |
| Content protection | `docs/CONTENT_PROTECTION_PLAN.md` |

Shared cross-cutting:

- `lib/engagement/engagement-source.ts` — enum: `user`, `system`, `admin_seed`, `import`, `test`
- `lib/engagement/aggregate-filters.ts` — exclude non-user sources from ranking/review stats
- Admin UI under `/admin/engagement/*` (settings + audit, following algorithm settings pattern)

---

## 5. Proposed schema overview

New tables are **additive**; existing `comments` / `chapter_reactions` remain for backward compatibility until migration prompts say otherwise.

```
inline_comment_threads ──┬── inline_comments
                         └── inline_comment_anchors (block_id, start_offset, end_offset, quote_text)

story_reviews (1 per user per story, multi scores + body)
story_review_stats (materialized / nightly rollup per story)

chapter_reaction_types (admin-configurable catalog)
chapter_reactions (migrate: reaction_key → reaction_type_id FK, or keep key synced from catalog)

story_boosts (ledger-linked spend, caps)
story_boost_daily_stats (aggregates for "Được đề cử" chart)
engagement_settings (key-value, admin)
engagement_setting_audit_logs

content_access_tokens (short-lived, hashed)
security_events (rate limit, bot challenge, crawl anomaly)
```

See child docs for column-level detail.

---

## 6. Reader integration plan

1. **Anchors in DOM:** Extend `PresentationReaderContent` / prose renderer to emit stable `data-chapter-block-id` (and char offsets in plain-text mirror) on publish and on read — required for inline comments.
2. **Selection UX:** Client hook on reader `<article>` — on text selection, open `InlineCommentComposer` with anchor payload; mobile sheet / desktop popover.
3. **Fetch threads:** Server component or RSC loader `getInlineThreadsForChapter(chapterId, { blockIds })` with pagination per thread.
4. **End-of-chapter comments:** Keep existing `ChapterCommentsPanel` for general discussion; inline for passage-specific (Wattpad model).
5. **Reactions:** Keep `ReaderReactionPanel` position; swap static options for `getActiveChapterReactionTypes()` from DB/cache.
6. **Reviews:** Story page tab `/truyen/[slug]` or dedicated section — not inside reader scroll (avoid distraction); link from reader end nav.
7. **Boost:** Story page CTA “Đề cử” → spend flow; never inside reader content iframe.
8. **Locked chapters:** No inline anchor creation on preview-only body; no full-text in API until `content_access_tokens` validates unlock.

---

## 7. Admin integration plan

| Area | Admin surface | Audit |
|------|---------------|-------|
| Reaction types | CRUD + reorder + enable/disable | `engagement_setting_audit_logs` |
| Inline moderation | Extend content review queue | `admin_audit_logs` |
| Review policy | Min read %, cooldown, self-review block | settings + audit |
| Boost economics | Daily cap per user, decay half-life, max weight in organic board | settings + audit |
| Anti-crawl | Rate limits, Turnstile site/secret keys, challenge threshold | settings + audit |
| Rankings job | Document that boost weight is **additive cap** not replacement | algorithm_setting_audit_logs |

Use existing permissions: `admin.settings.view` / `admin.settings.update` or new `admin.engagement.*` permissions in RBAC matrix.

---

## 8. Safety / anti-abuse rules

1. **Rate limits** on create: inline comment, review, reaction change, boost (extend `lib/rate-limit.ts` keys).
2. **One action per user per target** where applicable: one review/story, one reaction/chapter, boost caps/day.
3. **No self-review** — compare `story.creator_user_id` to reviewer.
4. **Read threshold** optional — e.g. `episodes_read_count / published_count >= min_read_ratio` from settings.
5. **Spam heuristics** — reuse `detectPotentialSpamContent` for review/inline bodies.
6. **Reporter quality** — reuse report pipeline for inline/review targets.
7. **Sybil resistance on boost** — ledger + daily cap + diminishing returns + admin review for anomalies.
8. **Never count** composer `fake_*` fields, cold-start impressions, or `engagement_source != 'user'` in public stats.
9. **Admin/system actions** labeled in UI (“ChapMee”, “Ban quản trị”) when displayed.

---

## 9. Monetization / ranking separation

| Rule | Implementation hint |
|------|---------------------|
| Boost ≠ organic #1 | Separate board type `boosted_stories` (“Được đề cử”); organic boards use existing snapshots without boost term |
| Capped blend | `effective_score = organic_score + min(boost_weight * boost_points_normalized, cap)` with `cap` from `engagement_settings` |
| Decay | `boost_points * exp(-λ * days_since_boost)` in nightly job |
| Ledger | Every boost → `transactions` row `type = 'story_boost'` + `story_boosts` row |
| Coin vs points | Phase 1: bonus points only; Phase 2: optional coin debit via existing wallet RPC |
| Transparency | Show “Đề cử” badge on cards; explain in FAQ — not paid #1 placement |

---

## 10. SEO / crawl protection rules

1. **Do not** block Googlebot on public story/chapter URLs that `shouldIndexEpisode` allows.
2. **Do not** cloak (same URL different body for bots vs users).
3. **Do not** render chapter as images for copy protection.
4. **Do** keep full text in SSR for indexable public free chapters (SEO benefit).
5. **Do** use `noindex` for locked/paid preview pages if policy requires (`buildRobotsMeta`).
6. **Do** rate-limit **high-volume automated** access via optional `GET /api/reader/chapter-content` with signed tokens — not the main HTML route for normal users.
7. **Do** log `security_events` for IP/user agents exceeding thresholds; optional Turnstile only on API or after anomaly (not on first HTML paint).

---

## 11. Phase-by-phase rollout

| Phase | Scope | MVP? | Risk |
|-------|--------|------|------|
| **0** | This documentation | — | — |
| **1** | Admin-configurable reaction types + migrate CHECK constraint to catalog table | MVP | Low — isolated from ranking |
| **2** | Structured story reviews + `story_review_stats` + story page UI | MVP | Medium — moderation load |
| **3** | Inline comments (anchors + threads + reader UI) | MVP (subset: prose-only, no composer blocks v1) | High — anchor drift on edit |
| **4** | Story boost + “Được đề cử” board + ledger | Post-MVP | High — economic abuse |
| **5** | Content protection API + signed tokens + bot hooks | Post-MVP | Medium — must not break SEO |

**TODO (explicitly later):**

- ML bot detection, cross-chapter inline search, review helpful votes, reaction animations, boost gifting, i18n reaction labels.

---

**Phase 2 implemented.** See `lib/reviews/story-reviews.ts` and `components/story/reviews/*`.

**Recommended next prompt:** Inline comments (Phase 3) per `docs/INLINE_COMMENTS_PLAN.md`.

---

## 12. Recommended next prompt (Phase 2 — done)

**Prompt 2 — Phase 1: Chapter reaction types (admin catalog + reader wiring)**

- Drizzle migration: `chapter_reaction_types`, seed defaults matching current keys.
- Admin CRUD + audit log.
- Replace hardcoded `CHAPTER_REACTION_OPTIONS` with server-fetched catalog (cache).
- Backward-compatible migration for existing `chapter_reactions.reaction_key`.

Then **Prompt 3 — Structured reviews** per `docs/STRUCTURED_REVIEWS_PLAN.md`.

---

## 13. Risks & technical debt

1. **Data client layer** still named `supabase` — new modules should use `lib/db` / PostgREST abstractions per `INFRA_MIGRATION.md`.
2. **Reaction keys in DB CHECK** block admin flexibility until migration.
3. **Chapter edits** invalidate inline anchors — need orphan strategy before scale.
4. **Composer fake counts** — audit all metric queries to exclude presentation blocks.
5. **SSR full text** — public chapters remain scrape-friendly; protection is rate-based, not secrecy-based.
6. **Comment pagination** — episode comments capped at 30 with no cursor; inline will need proper pagination.

---

## 14. Acceptance checklist (Prompt 1)

- [x] Audit completed
- [x] `docs/READER_ENGAGEMENT_ARCHITECTURE.md` created
- [x] Child plans created
- [x] No large runtime code changes
- [ ] `pnpm build` — see validation report in agent output
