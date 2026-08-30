# Media Storage Reference Fix Report

**Date:** 2026-06-03  
**Based on:** [MEDIA_STORAGE_REFERENCE_AUDIT_REPORT.md](./MEDIA_STORAGE_REFERENCE_AUDIT_REPORT.md)  
**Standard:** [MEDIA_STORAGE_STANDARD.md](./MEDIA_STORAGE_STANDARD.md)

---

## Summary

Controlled fixes applied for audit findings **R1–R5** (high/medium upload, render, and FK issues). Internal uploads now persist **`media_asset_id` / object_key**; display URLs are resolved at read time. Legacy URL columns retained with normalization and fallback.

**Build:** `pnpm build` **not run** (per constraints; `npx tsc --noEmit` passed).

---

## Fixed upload pipelines

| Pipeline | Change |
|----------|--------|
| **Admin content post cover** (`lib/platform-content/upload-cover.ts`) | Uploads to app bucket, registers `storage_assets`, returns `{ mediaAssetId, objectKey, previewUrl }` — **does not** persist public URL |
| **Content post save** (`lib/admin/content-post-actions.ts`) | Persists `cover_media_asset_id`, `og_image_media_asset_id`; legacy `*_url` only as object key via `normalizeMediaFieldForStorage` |
| **Story cover** (`lib/images/upload-story-image-variants.ts`, `lib/stories/update-story-image.ts`) | `coverMediaAssetId` from portrait `storage_assets` row; fixes wrong FK (`story_images.id` → real asset id) |
| **Avatar** | Already compliant; **legacy profile form** blocked from setting raw `avatar_url` |
| **Taxonomy OG** | Admin form uses `SeoMediaAssetField` → `og_image_asset_id` |
| **Avatar / chapter / composer / reels / SEO Center** | Unchanged (already compliant from audit) |

---

## Fixed render / loaders

| File | Fix |
|------|-----|
| `lib/search/story-search.ts` | `resolveStoryCoverUrl` |
| `lib/studio/get-studio-stories.ts` | `resolveStoryCoverUrl` |
| `lib/studio/get-studio-comments.ts` | `profileAvatarUrlFromRow` |
| `lib/episodes/getEpisodeReaderData.ts` | `resolveReelsBackgroundUrl` for chapter background |
| `lib/search/collect-candidates.ts` | `resolveStoredMediaUrl` for content post covers |
| `lib/settings/get-footer-config.ts` | Logo via `resolveMediaAssetPublicUrl` (object key), not `public_url` |
| `lib/seo/public-page-metadata.ts` | Content post + taxonomy OG via asset id resolvers |
| `lib/seo/pinterest-feed.ts` | Story cover + taxonomy OG resolved |
| `lib/taxonomy/resolve-taxonomy-media.ts` | New helper |
| `lib/platform-content/resolve-content-post-media.ts` | New helper |
| `app/bai-viet/[slug]/page.tsx` | Passes `cover_media_asset_id` / `og_image_media_asset_id` to metadata |

---

## New / updated helpers

- **`lib/media/media-resolver.ts`** — `resolveMediaObjectUrl`, `getMediaAssetPublicUrl`, `normalizeMediaFieldForStorage`, `assertNoLocalHardcodedMediaUrl`, `isAllowedExternalMediaUrl`, `extractObjectKeyFromPublicUrl`, `resolveMediaAssetUrl` (alias)

---

## Schema

**Migration:** `drizzle/0025_entity_media_asset_ids.sql`

| Table | New columns |
|-------|-------------|
| `admin_content_posts` | `cover_media_asset_id`, `og_image_media_asset_id` |
| `platform_announcements` | `cover_media_asset_id`, `og_image_media_asset_id` |
| `taxonomy_terms` | `og_image_asset_id` |

**Shim runner:** `scripts/db-apply-shims.mjs` updated to apply all `NNNN_*.sql` (not only `000x`).

---

## Deprecated fields (kept)

- `profiles.avatar_url`, `stories.cover_url`, `story_images.*_url`, `cover_image_url`, `og_image_url` — legacy fallback; new writes use asset ids or object keys only.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/audit-media-storage-refs.ts` | Read-only scan; `--strict` exits 1 on hits |
| `scripts/migrate-hardcoded-media-urls.ts` | Dry-run by default; `--apply` requires `--backup-file` |
| `npm run media:refs:audit` | Audit with `--strict` |
| `npm run media:refs:migrate` | Dry-run migration |

---

## Validation results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **Pass** |
| `npx tsx scripts/audit-media-storage-refs.ts` | **0 hits** |
| `npx tsx scripts/migrate-hardcoded-media-urls.ts --dry-run --limit=50` | **0 applicable** (local DB clean / no legacy absolute URLs) |
| `pnpm build` | **Not run** (scope constraint) |
| DB migration 0025 | Applied on local DB |

---

## Remaining URL fields (intentional)

| Field | Reason |
|-------|--------|
| Footer `badgeImageUrl`, DMCA `imageUrl` | External compliance assets (may be gov CDN) |
| `storage_assets.public_url` | Registry snapshot only — prefer resolve from `path` |
| External audio / YouTube / `source_url` | Valid external links |
| `collections.cover_image_url` | Manual/legacy object key — resolved at read; dedicated upload TBD |

---

## Fixed upload pipelines (continued)

| Pipeline | Change |
|----------|--------|
| **Platform announcement OG** (`lib/admin/announcement-actions.ts`, `AnnouncementForm.tsx`) | Persists `og_image_media_asset_id`; legacy `og_image_url` normalized to object key only |
| **Content hub legacy save** (`lib/admin/platform-content-actions.ts`) | Cover URL normalized to object key before save |

---

## Fixed render / loaders (continued)

| File | Fix |
|------|-----|
| `lib/platform-content/enrich-content-post-media.ts` | Resolves `coverDisplayUrl` at read time |
| `lib/platform-content/content-posts.ts` | Lists/getters enrich cover display |
| `components/content-posts/ContentPostCard.tsx` | Uses `coverDisplayUrl` |
| `app/bai-viet/[slug]/page.tsx` | Hero cover via `coverDisplayUrl` |
| `lib/platform-content/resolve-announcement-media.ts` | Announcement OG resolver |
| `lib/seo/build-metadata.ts` | Announcement metadata via asset id |
| `app/thong-bao/[slug]/page.tsx` | Passes `og_image_media_asset_id` |
| `lib/data/collections.ts`, `lib/profile/get-public-collections.ts` | `resolveStoredMediaUrl` for collection covers |
| `src/lib/audio/audio-queue.ts` | `resolveStoryCoverUrl` for queue covers |
| `lib/content-posts/post-seo.ts` | SEO checklist considers `cover_media_asset_id` |

---

## Risk / TODO

1. **Production backfill** — run migration dry-run on staging dump before `--apply`.
2. **`cover_media_asset_id` backfill** — existing stories may have null FK until next cover upload; `cover_url` object key still works via resolver.
3. **Collection cover upload** — no dedicated upload pipeline yet; `cover_image_url` stores object key when set manually.
4. **Re-run audit** after deploy: `npm run media:refs:audit`.

---

## Files changed (main)

- `lib/media/media-resolver.ts` (new)
- `lib/platform-content/upload-cover.ts`, `resolve-content-post-media.ts`
- `lib/admin/content-post-actions.ts`
- `lib/images/upload-story-image-variants.ts`, `lib/stories/update-story-image.ts`
- `lib/studio/updateCreatorProfile.ts`
- `lib/taxonomy/*`, `components/admin/taxonomy/TaxonomyTermFormModal.tsx`
- `components/admin/content-posts/*`
- `drizzle/0025_entity_media_asset_ids.sql`
- `scripts/audit-media-storage-refs.ts`, `scripts/migrate-hardcoded-media-urls.ts`
- `scripts/db-apply-shims.mjs`
- `docs/MEDIA_STORAGE_STANDARD.md`
