# ChapMee Media Storage Standard

## Principles

1. **Internal uploads** (avatar, story/chapter cover, composer images, reels background, admin content, SEO OG, footer logo) must register in `storage_assets` / `media_assets` view.
2. **Entities store references**, not display URLs:
   - Prefer `*_media_asset_id` / `media_asset_id` (UUID → `storage_assets.id`)
   - Legacy `*_url` columns may hold **object_key** only during migration — never localhost, `/uploads`, `file://`, or absolute MinIO/S3 URLs.
3. **Display URLs** are built at read time via `lib/media/media-resolver.ts` and `S3_PUBLIC_BASE_URL` / `getPublicMediaUrl(objectKey)`.
4. **`object_key` is stable** when moving MinIO local → Vietnix S3 (same bucket layout, new base URL in env).

## Allowed external URL exceptions

Do **not** migrate these to object storage:

- External audio (`external_audio_url`)
- YouTube / film adaptation URLs
- Story translation `source_url`
- SEO `canonical_url`
- Footer legal / DMCA / Bộ Công Thương verification links
- Campaign external CTAs

## Deprecated fields (keep for backward compatibility)

| Entity | Deprecated | Preferred |
|--------|------------|-----------|
| Profile | `avatar_url` | `avatar_media_id` + object key in `avatar_url` legacy |
| Story | `cover_url` | `cover_media_asset_id` + object keys in `story_images.*_url` |
| Content post | `cover_image_url`, `og_image_url` | `cover_media_asset_id`, `og_image_media_asset_id` |
| Taxonomy | `og_image_url` | `og_image_asset_id` |
| Story images | `*_url` column names | Values are object keys; resolved via `getStoryImageVariantUrl` |

## Composer image blocks

```json
{
  "type": "image",
  "media_id": "<chapter_images.id or storage_assets id>",
  "alt": "...",
  "caption": "..."
}
```

Do not persist `src: "http://localhost:9000/..."` for ChapMee uploads.

## Helpers

| Function | Purpose |
|----------|---------|
| `resolveMediaObjectUrl(objectKey)` | Build public URL from key |
| `resolveMediaAssetUrl(assetId)` | Alias → `resolveMediaAssetPublicUrl` |
| `normalizeMediaFieldForStorage(value)` | Reject absolute URLs before legacy column write |
| `assertNoLocalHardcodedMediaUrl(url)` | Guardrail on persist |

## Scripts

```bash
# Guardrail — fails on forbidden patterns (--strict)
npm run media:refs:audit

# Read-only scan without failing CI
npx tsx scripts/audit-media-storage-refs.ts

# Migration dry-run (default)
npm run media:refs:migrate
npx tsx scripts/migrate-hardcoded-media-urls.ts --dry-run --limit=50

# Apply (requires backup file)
npx tsx scripts/migrate-hardcoded-media-urls.ts --apply --backup-file=./backup-media-migration.json
```

## Schema migration

Apply shim: `drizzle/0025_entity_media_asset_ids.sql` via `npm run db:shims`.

## Do not

- Run `docker compose down -v` on environments with data you care about.
- Store `getPublicUrl()` / MinIO absolute URLs in entity columns.
- Hard-code production or localhost domains in components.

## Related docs

- [MEDIA_STORAGE_REFERENCE_AUDIT_REPORT.md](./MEDIA_STORAGE_REFERENCE_AUDIT_REPORT.md)
- [MEDIA_STORAGE_REFERENCE_FIX_REPORT.md](./MEDIA_STORAGE_REFERENCE_FIX_REPORT.md)
