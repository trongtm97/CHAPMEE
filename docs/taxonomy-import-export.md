# Admin Taxonomy Import/Export

Route: `/admin/taxonomy/import-export`

**Không phải** Studio import/export (`/studio/import`) — không đụng `structured_content_json` hay Composer blocks.

## Modules

| Path | Role |
|------|------|
| `lib/taxonomy/import-export/` | Parse, validate, export, execute, jobs |
| `lib/admin/taxonomy-import-export-actions.ts` | Server actions |
| `components/admin/taxonomy/TaxonomyImportExportPage.tsx` | UI 4 tabs |
| `supabase/migrations/183_taxonomy_import_export_jobs.sql` | Job history table |

## Permissions

- `taxonomy.view` — preview, history, templates
- `taxonomy.import` — confirm import
- `taxonomy.export` — export catalog
- `taxonomy.edit` — field updates via import (existing RBAC on term mutate)

## Import modes

1. `create_only`
2. `update_by_type_slug`
3. `upsert_by_type_slug`
4. `disable_missing_in_file` (+ confirm checkbox)

Legacy modal vẫn dùng `create|update|upsert` — mapped qua `run-import-flow.ts` (validation Composer block, parent loop, SEO fields).

## Composer safety

- `BLOCKED_TAXONOMY_TYPE_VALUES` = COMPOSER_BLOCK_TYPES
- `presentation_mode` + `is_selectable_by_creator` → validate via `isPresentationModeSupportedByComposer`
- Không sửa `lib/studio/import-export-v2-server.ts`

## Post-import

- `revalidateTaxonomyCatalogSurfaces()` — invalidate taxonomy/discover/catalog caches
- Job `error_summary.issues` — tối đa 100 dòng, tải CSV qua history tab

## Migration

`183_taxonomy_import_export_jobs.sql` — chạy `npx supabase db push`
