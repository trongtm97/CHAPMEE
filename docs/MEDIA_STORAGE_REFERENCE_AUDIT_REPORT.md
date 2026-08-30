# Media Storage Reference Audit Report

**Project:** ChapMee (Next.js / TypeScript / local-first MinIO → future Vietnix S3)  
**Date:** 2026-06-03  
**Scope:** Read-only audit — schema, code, upload/render pipelines, Composer JSON, local DB scan  
**Constraint:** No data mutations performed.

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Core registry (`storage_assets` / `media_assets` view) | **Mostly correct** | Single source of truth with `path` (object key), optional `public_url` on registry row only |
| Story / chapter / avatar uploads (new pipelines) | **Mostly correct** | New uploads persist **object keys**, not localhost URLs |
| SEO Center (overrides/settings) | **Correct** | Uses `*_image_asset_id` FK to `storage_assets` |
| Admin content posts / taxonomy OG | **Not fully migrated** | Still uses `cover_image_url` / `og_image_url` text URL fields |
| Legacy dual fields (`cover_url`, `avatar_url`, `*_url` columns) | **Transitional** | Often hold object keys; read path resolves via helpers — but naming and some code paths still pass raw DB values |
| Local DB content scan | **Clean (scanned)** | `npx tsx scripts/audit-media-storage-refs.ts` → **0 forbidden patterns** in scanned fields |

**Verdict:** ChapMee is **partially compliant**. Primary user-facing media (story cover, chapter images, avatar, reels background, Composer `media_id`, chapter S3 content) follows object-key / asset-id architecture. Several **admin/platform surfaces** and **legacy URL-named columns** still store or accept absolute URLs. No localhost/MinIO hard URLs were found in the local DB sample, but **code-level risk remains** where upload pipelines return `getPublicUrl()` and entities persist that value.

---

## 1. Schema / Database Model

### 1.1 Correct fields (Category A)

| Table / entity | Field(s) | Role |
|----------------|----------|------|
| `storage_assets` | `id`, `bucket`, `path`, `checksum`, `mime_type`, `size_bytes`, `usage_type`, `linked_entity_*`, `status` | Canonical media registry; `path` = stable object key |
| `media_assets` (view) | `storage_path` (= `path`), `id`, metadata | Compatibility view over `storage_assets` |
| `profiles` | `avatar_media_id` | FK-style link to storage asset |
| `stories` | `cover_media_asset_id` | Intended FK to `storage_assets` (see issue below) |
| `stories` | `license_document_media_id` | Translation rights document |
| `chapter_images` | `id` used as `mediaAssetId` in Composer; `image_url`, `thumb_url` store **object keys** |
| `episodes` | `content_object_key`, `content_storage_type` | Chapter body in object storage |
| `seo_settings` | `default_og_image_asset_id` | OG default via asset id |
| `seo_overrides` | `og_image_asset_id`, `twitter_image_asset_id` | Per-page OG/Twitter via asset id |
| `app_settings` (footer JSON) | `brand.logoMediaId` | Footer logo via asset id |
| Composer blocks | `media_id` on `image`, `case_evidence.items[].media_id` | Internal media reference |

**Migration reference:** `db/migrations/legacy/198_media_optimization_foundation.sql`, `drizzle/0006_stories_cover_media_asset.sql`, `drizzle/0007_profiles_avatar_media.sql`, `drizzle/0023_seo_center.sql`.

### 1.2 Valid external link fields (Category B)

| Field | Module | Notes |
|-------|--------|-------|
| `stories.source_url` | Translation / content origin | External source link — intentional |
| `stories.canonical_url` | SEO | Canonical page URL — intentional |
| `audio_items.external_audio_url`, `normalized_external_audio_url` | Audio companion | Paste external audio — intentional |
| `film_adaptations.youtube_url`, `youtube_video_id` | Film adaptations | YouTube embed — intentional |
| Footer `verificationUrl`, `linkUrl`, legal `href` | Footer / compliance | External gov/legal links — intentional |
| Campaign `cta_url` | Ads / campaigns | External CTA — intentional |

### 1.3 Dangerous / transitional fields (Category C)

| Table | Field | Current behavior | Risk |
|-------|-------|------------------|------|
| `profiles` | `avatar_url` | New uploads store **object key**; legacy may hold absolute URL | **Medium** — dual semantics; deprecated form can set arbitrary string |
| `stories` | `cover_url` | New uploads store **portrait object key**; legacy may hold URL | **Medium** — resolved at read time in most public paths |
| `story_images` | `original_url`, `portrait_url`, … | Named `*_url` but new code writes **object keys** | **Low** — `getStoryImageVariantUrl()` resolves via `resolveStoredMediaUrl` |
| `episodes` | `background_image_url` | Object key when set via reels/chapter flow | **Medium** — reader API returns raw value without resolve |
| `reels_items` | `background_image_url` | Normalized to object key on save | **Low** — `resolveReelsBackgroundUrl` on display paths |
| `taxonomy_terms` | `og_image_url` | Free-text URL | **High** — no `media_asset_id`; admin can paste any URL |
| `admin_content_posts` | `cover_image_url`, `og_image_url` | Upload returns **MinIO public URL** → saved to DB | **High** — binds to current `S3_PUBLIC_BASE_URL` / MinIO host |
| `platform_announcements` | `cover_image_url`, `og_image_url` | Same pattern as content posts | **High** |
| `collections` | `cover_image_url` | Text field; no dedicated upload pipeline found | **Medium** — may be URL or unset |
| `storage_assets` | `public_url` | Snapshot of `getPublicUrl()` at register time | **Low** in registry; **Medium** when read directly (footer logo resolver) |

**Bug — `stories.cover_media_asset_id`:** `saveStoryImageRecord` sets `cover_media_asset_id: input.imageId` where `imageId` is a **`story_images.id`**, not a `storage_assets.id`. The column FK targets `storage_assets` (`drizzle/0006_stories_cover_media_asset.sql`). This breaks the intended asset-id link until fixed.

---

## 2. Code Hard-Coded URL Search

Patterns searched: `localhost`, `127.0.0.1`, `:9000`, `/public/uploads`, `/uploads/`, `file://`, `C:\`, `D:\`, `minio`, `coverUrl`, `getPublicUrl`, etc.

### 2.1 Legitimate (env / resolver / dev-only)

| Location | Purpose |
|----------|---------|
| `lib/storage/s3.ts` — `getPublicMediaUrl`, `S3_ENDPOINT` | Runtime URL builder from object key — **correct** |
| `lib/media/media-url.ts` — `LOCAL_URL_PATTERNS`, `resolveStoredMediaUrl` | Detection + resolution — **correct** |
| `lib/db/pool.ts`, PostgREST clients | DB connection defaults for local dev — **not media storage** |
| `next.config.ts` | `images.remotePatterns` for localhost:9000 dev — **config only** |
| `lib/seo/seo-media.ts`, `seo-validation.ts` | Reject localhost for canonical/OG — **correct guardrails** |
| `components/common/ChapMeeCover.tsx` — `canUseNextImage` | Allows localhost host for Next/Image in dev — **display only** |
| `URL.createObjectURL` in studio/admin | Browser blob preview / CSV export — **not persisted** |

### 2.2 Risky code paths (persist or pass raw URL)

| File | Issue | Severity |
|------|-------|----------|
| `lib/platform-content/upload-cover.ts` | Returns `data.publicUrl` from `getPublicUrl()`; caller saves to `cover_image_url` | **High** |
| `lib/admin/content-post-actions.ts` | Persists `cover_image_url` / `og_image_url` from form (often absolute URL) | **High** |
| `lib/taxonomy/admin-data.ts` | Persists `og_image_url` as free text | **High** |
| `lib/studio/updateCreatorProfile.ts` | Deprecated action writes `avatar_url` from form without upload pipeline | **High** |
| `lib/images/upload-story-image-variants.ts` | Registers `publicUrl: data.publicUrl` on `storage_assets` (registry only) | **Low** |
| `lib/settings/get-footer-config.ts` | Resolves logo via `storage_assets.public_url` instead of object key | **Medium** |
| `lib/search/story-search.ts` | Returns raw `cover_url` without `resolveStoryCoverUrl` | **Medium** |
| `lib/studio/get-studio-stories.ts` | Studio list `coverUrl: story.cover_url` raw | **Medium** |
| `lib/studio/get-studio-comments.ts` | `authorAvatarUrl: profile?.avatar_url` raw | **Medium** |
| `lib/episodes/getEpisodeReaderData.ts` | `backgroundImageUrl: episode.background_image_url` without resolve | **Medium** |
| `lib/search/collect-candidates.ts` | `post.cover_image_url` passed as `imageUrl` without resolver | **Medium** |
| `lib/seo/pinterest-feed.ts` | `resolvePublicUrl(term.og_image_url)` — assumes URL string | **Medium** |

No instances of hard-coded `http://localhost:9000/...` or `/public/uploads/` were found **in application logic that writes to DB** (only in validators that forbid them).

---

## 3. Upload Pipeline Audit

| Pipeline | Upload to S3/MinIO | Creates `storage_assets` | Stores object key on entity | Stores URL on entity | Notes |
|----------|-------------------|--------------------------|----------------------------|----------------------|-------|
| Avatar (`lib/profile/uploadAvatar.ts`) | Yes | Yes (`registerStorageAsset`) | Yes (`avatar_url` = key, `avatar_media_id`) | No | **Compliant** |
| Story cover (`lib/images/complete-story-image-upload.ts` → `upload-story-image-variants.ts`) | Yes | Yes (per variant + derivatives) | Yes (`story_images.*_url` = paths, `stories.cover_url` = portrait path) | No on entity | **Compliant**; FK bug on `cover_media_asset_id` |
| Chapter image (`lib/images/upload-chapter-image.ts`) | Yes | Via `chapter-image-storage` | Yes (`image_url`, `thumb_url` keys) | No | **Compliant** |
| Composer image (presign API) | Yes | Yes (`createPendingMediaAsset` → `completeMediaAsset`) | Block uses `media_id` | No | **Compliant** |
| Reels background | Via story/chapter picker or normalized save | Indirect | Yes (object key in `background_image_url`) | Rejects external paste | **Compliant** |
| SEO OG (`SeoMediaAssetField` + presign) | Yes | Yes | Yes (`og_image_asset_id`) | No | **Compliant** |
| Footer logo | Via media asset id in JSON | Yes | `logoMediaId` only | Badge URLs still text | **Partial** |
| Admin content post cover (`lib/platform-content/upload-cover.ts`) | Yes (bucket `content-posts`) | Yes | No | **Yes** — returns & stores `publicUrl` | **Non-compliant** |
| Taxonomy OG image | Manual URL in admin form | No | No | **Yes** — `og_image_url` | **Non-compliant** |
| Legacy creator profile form | No upload | No | Arbitrary `avatar_url` string | Possible | **Non-compliant** |
| Import pipeline | S3 object keys for chapter content | Partial | `content_object_key` | — | **Compliant** for body; images via import storage module |

**Presign entrypoint:** `app/api/media/presign-upload/route.ts`, `app/api/media/complete-upload/route.ts` — returns `resolvedUrl` for **preview only**; entity should store `mediaAssetId` / object key.

---

## 4. Render / Display Pipeline Audit

### 4.1 Helpers (correct pattern)

| Helper | Role |
|--------|------|
| `lib/media/media-url.ts` — `resolveStoredMediaUrl`, `getMediaUrlFromAsset` | Core resolver: object key → `S3_PUBLIC_BASE_URL` |
| `lib/stories/resolve-story-cover-url.ts` | Story cover wrapper |
| `lib/profile/resolve-profile-avatar.ts` | Avatar wrapper |
| `lib/reels/resolve-reels-background.ts` | Reels/chapter background |
| `types/story-images.ts` — `getStoryImageVariantUrl` | Story image variants |
| `lib/seo/seo-media.ts` — `resolveMediaAssetPublicUrl` | OG from asset id |
| `lib/images/get-story-image.ts` | Catalog card / cover 3:4 via variants |

### 4.2 Components audited

| Component | Input | Resolves correctly? |
|-----------|-------|---------------------|
| `ChapMeeImage` | `url` / `asset.publicUrl` (pre-resolved) | Yes if caller passes resolved URL |
| `ChapMeeCover` / `ChapMeeStoryCover` | Resolved `src` from `getStoryImageForUsage` | Yes — 3:4 aspect via `CHAPMEE_COVER_ASPECT_CLASS` |
| `StoryCatalogCard`, discover cards | Via `resolveStoryCoverUrl` / enrich layers | Mostly yes |
| Profile avatar UI | Via `profileAvatarUrlFromRow` in public paths | Mostly yes |
| Reader image blocks | `get-chapter-images-map` resolves keys | Yes |
| SEO OG resolver | Asset id → `resolveMediaAssetPublicUrl` | Yes |
| Studio comments / search hits | Raw DB fields in some loaders | **Gap** |

---

## 5. Composer / Content JSON

| Check | Status |
|-------|--------|
| Image block schema uses `media_id` | Yes (`lib/composer/schema.ts`) |
| Upload attaches `mediaAssetId` / `src` as object key | Yes (`lib/images/upload-chapter-image.ts`) |
| Publish scan for forbidden local URLs | Yes (`lib/media/content-media-validator.ts`, `verify-chapter-media-for-publish.ts`) |
| Publishing check for missing `media_id` | Yes (`components/composer/ComposerPublishingCheck.tsx`, `verifyChapterMediaIdsForPublish`) |
| Plain chapter `content` HTML | Scanned for localhost/upload paths before persist |

**Note:** Block `src` / `thumbSrc` may still contain object keys (not URLs) — render path must resolve (reader uses chapter image map).

---

## 6. Database Scan Results

**Script:** `scripts/audit-media-storage-refs.ts` (read-only)  
**Command run:** `npx tsx scripts/audit-media-storage-refs.ts`  
**DB connected:** Yes (local PostgreSQL via `DATABASE_URL` / default local pool)

| Metric | Value |
|--------|-------|
| Total hits | **0** |
| Critical | 0 |
| High | 0 |
| Medium | 0 |

**Tables scanned (scalar):** `profiles`, `stories`, `episodes`, `reels_items`, `chapter_images`, `story_images`, `taxonomy_terms`, `admin_content_posts`, `platform_announcements`, `collections`, `storage_assets`  
**JSON/text sampled:** `episodes.content`, `episodes.structured_content`, `stories.standalone_content_json`, `reels_items.body`, `app_settings.value`

Local DB has **no rows** matching localhost, MinIO `:9000`, `/uploads`, `file://`, or Windows paths in scanned fields. Re-run after production export or before VPS cutover.

---

## 7. External URL Exceptions (documented)

These are **allowed** and should not be migrated to object keys:

- External audio URLs (`external_audio_url`) when `audio_source_type = external_audio_url`
- YouTube URLs / video IDs for audio and film adaptations
- Story translation `source_url`, SEO `canonical_url`
- Footer legal links, DMCA link mode, Bộ Công Thương `verificationUrl`
- Campaign / announcement external CTAs

---

## 8. Risk Register

| ID | Risk | Level | Evidence |
|----|------|-------|----------|
| R1 | Admin content post / announcement cover stores MinIO public URL | **High** | `lib/platform-content/upload-cover.ts` returns `url: data.publicUrl` |
| R2 | Taxonomy OG uses `og_image_url` text | **High** | `lib/taxonomy/admin-data.ts` |
| R3 | Legacy profile form can set raw `avatar_url` | **High** | `lib/studio/updateCreatorProfile.ts` |
| R4 | `cover_media_asset_id` points to wrong id type | **Medium** | `lib/stories/update-story-image.ts` |
| R5 | Several loaders pass raw `cover_url` / `avatar_url` to UI | **Medium** | `story-search.ts`, `get-studio-stories.ts`, etc. |
| R6 | Footer badge / DMCA image URLs are free-text | **Medium** | `lib/settings/footer-config.ts` — may be external CDN by design |
| R7 | `storage_assets.public_url` may embed dev MinIO host | **Low** | Registry snapshot; prefer resolve from `path` |
| R8 | Column names `*_url` imply URL but hold keys | **Low** | Naming debt; behavior mostly correct |

**Critical (localhost in DB content):** None found in local DB scan. Guardrails exist in publish validators.

---

## 9. Safe Remediation Plan (no big-bang rewrite)

### Phase 1 — Stop the bleeding (code only, no mass DB rewrite)

1. **Content post cover:** Change `uploadContentPostCoverAction` to return `{ objectKey, mediaAssetId }`; add `cover_media_asset_id` column (or reuse storage link); keep `cover_image_url` read-only legacy until backfill.
2. **Taxonomy OG:** Add `og_image_asset_id`; migrate admin UI to `SeoMediaAssetField` pattern.
3. **Disable or harden** `updateCreatorProfileAction` avatar_url direct write — require `uploadAvatarAction` only.
4. **Fix** `cover_media_asset_id` to store real `storage_assets.id` (portrait variant asset), not `story_images.id`.

### Phase 2 — Read-path consistency

1. Apply `resolveStoryCoverUrl` / `profileAvatarUrlFromRow` / `resolveReelsBackgroundUrl` in all remaining loaders (studio search, comments, reader episode background).
2. Footer logo: resolve from `path` via `getMediaUrlFromAsset`, not `public_url`.

### Phase 3 — Data backfill (optional, scripted)

1. Run `scripts/audit-media-storage-refs.ts --json` on staging/production dumps.
2. For rows where `cover_image_url` / `og_image_url` match `S3_PUBLIC_BASE_URL`, extract object key substring and populate asset id columns.
3. Leave external URLs (YouTube, source links) untouched.

### Phase 4 — Schema cleanup (later)

1. Rename or document `*_url` columns that hold object keys.
2. Deprecate redundant URL columns once all readers use asset id + resolver.

---

## 10. Files Inspected (representative)

**Schema / migrations:** `198_media_optimization_foundation.sql`, `0006_stories_cover_media_asset.sql`, `0007_profiles_avatar_media.sql`, `0023_seo_center.sql`, `lib/db/schema/seo-center.ts`, `lib/db/schema/foundation.ts`

**Media core:** `lib/storage/media.ts`, `lib/storage/s3.ts`, `lib/storage/asset-service.ts`, `lib/media/media-url.ts`, `lib/media/content-media-validator.ts`

**Upload:** `lib/profile/uploadAvatar.ts`, `lib/images/upload-chapter-image.ts`, `lib/images/upload-story-image-variants.ts`, `lib/images/complete-story-image-upload.ts`, `lib/platform-content/upload-cover.ts`, `app/api/media/presign-upload/route.ts`, `app/api/media/complete-upload/route.ts`

**Render:** `components/media/ChapMeeImage.tsx`, `components/common/ChapMeeCover.tsx`, `lib/images/get-story-image.ts`, `lib/seo/seo-media.ts`, `lib/settings/get-footer-config.ts`

**Composer:** `lib/composer/schema.ts`, `lib/images/verify-chapter-media-for-publish.ts`, `components/composer/ComposerPublishingCheck.tsx`

**Scripts:** `scripts/audit-media-storage-refs.ts` (new), `scripts/check-media-integrity.ts`

---

## 11. Validation Steps Performed

1. `git status` — audit adds report + script only; no data changes  
2. Grep for hard-coded URL patterns across `*.{ts,tsx,sql}`  
3. Schema / `media_assets` / `storage_assets` review  
4. Upload pipeline trace (avatar, story, chapter, composer, reels, SEO, content posts, footer)  
5. Render helper / component trace  
6. DB scan: `npx tsx scripts/audit-media-storage-refs.ts` — **executed successfully**  
7. Did **not** run `pnpm build` (per constraints)

---

## 12. Next Steps

1. Prioritize **R1–R3** (admin content post cover, taxonomy OG, legacy avatar form).  
2. Fix **R4** (`cover_media_asset_id` FK semantics).  
3. Schedule production DB scan using the same script before MinIO → Vietnix S3 cutover.  
4. After code fixes, re-run audit script and compare hit counts.

---

*Report generated by automated codebase audit. No production or local DB rows were modified.*
