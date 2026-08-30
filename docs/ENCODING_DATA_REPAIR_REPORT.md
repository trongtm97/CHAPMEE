# Encoding Data Repair Report — ChapMee

**Date:** 2026-06-03  
**Scope:** Prompt 3 — DB/seed mojibake scan, dry-run repair, backup-gated apply.  
**Prerequisite:** [ENCODING_STANDARD.md](./ENCODING_STANDARD.md), [ENCODING_AUDIT_REPORT.md](./ENCODING_AUDIT_REPORT.md)

---

## Summary

| Item | Result |
|------|--------|
| **DB suspicious rows (local `chapmee_local`)** | **0** |
| **High-confidence repairs applied** | **0** (nothing to apply) |
| **Backup file created** | None (no `--apply` run) |
| **Seed/source file scan** | 0 actionable files (1 false positive excluded) |
| **`pnpm build`** | Not run (per constraints) |

Local database already stores Vietnamese correctly (confirmed in Prompt 1). Tools are in place for dev/staging/production when mojibake rows exist.

---

## 1. Text tables / fields (whitelist)

Defined in `lib/encoding/db-text-fields.ts` — **73** field specs across:

| Table | Repairable text fields (sample) |
|-------|--------------------------------|
| `stories` | title, hook, short/long_description, seo_*, notes, standalone_plain_text, … |
| `episodes` | title, excerpt, plain_text_preview, seo_*, notes (`content` scan-only, repair off) |
| `profiles` | display_name, bio, verification_label, community_trust_note |
| `taxonomy_terms` | name, description, display_label, seo_*, internal_note |
| `seo_content_blocks` | title, summary, content_markdown |
| `seo_overrides` | title, meta_description, og_*, twitter_* |
| `comments` | content |
| `community_posts` | title, content, moderation/public notes |
| `notifications` | title, body |
| `platform_announcements` | title, body, excerpt, seo_* |
| `admin_content_posts` | title, excerpt, content, seo_* |
| `reels_items` | title, hook, body, cta |

**Excluded:** slug, URLs, object_key, username, icon/color codes, JSON blobs (`faq_json`, `structured_content`, `app_settings.value`), passwords/tokens.

---

## 2. Repair heuristic

**Module:** `lib/encoding/mojibake-repair.ts` (repo uses `lib/`, not `src/lib/`).

| Function | Purpose |
|----------|---------|
| `isSuspiciousMojibake(text)` | Mojibake + Æ/Ñ/replacement char hints |
| `repairCommonVietnameseMojibake(text)` | Latin-1 reinterpret → UTF-8 (max 2 passes) |
| `calculateRepairConfidence(original, repaired)` | Score 0–1, bucket high/medium/low |
| `containsReplacementChar(text)` | U+FFFD / mojibake replacement |
| `shouldRepairField(table, field)` | Whitelist guard |
| `previewMojibakeRepair(text)` | Full preview for CLI |

**Verified repair example (unit check via tsx):**

| Input (mojibake) | Output | Confidence |
|------------------|--------|------------|
| `Truyá»‡n sÃ¡ng tÃ¡c` | `Truyện sáng tác` | **high** |

**Rules enforced:**

- No repair unless original is suspicious.
- No apply on low confidence or if repaired text still suspicious.
- Replacement-char originals capped below auto-apply.
- Slug/URL/object_key fields not repairable.

---

## 3. Scripts added

| Script | npm command | Description |
|--------|-------------|-------------|
| `scripts/scan-mojibake-db.ts` | `npm run mojibake:scan:db` | Read-only DB scan |
| `scripts/repair-mojibake-db.ts` | `npm run mojibake:repair:db` | Dry-run default; `--apply` + `--backup-file` |
| `scripts/scan-mojibake-files.ts` | `npm run mojibake:scan:files` | Seed/SQL/JSON/MD scan |

**Shared:** `lib/encoding/db-mojibake-scan.ts`

### CLI flags

**scan-mojibake-db.ts**

- `--limit=N` (default 100 per field)
- `--table=stories`
- `--json`

**repair-mojibake-db.ts**

- `--dry-run` (default)
- `--apply` (requires `--backup-file=...`)
- `--table`, `--field`, `--limit`

**scan-mojibake-files.ts**

- `--json`

---

## 4. Commands run (local)

```bash
npm run mojibake:scan:db -- --limit=100
# → 73 fields scanned, 0 suspicious rows

npm run mojibake:repair:db -- --dry-run --limit=100
# → 0 hits, 0 planned repairs

npm run mojibake:scan:files
# → 229 files scanned, 0 actionable (legacy slug charset SQL ignored as non-repairable)

npm run typecheck
# → pass

npm run db:encoding
# → UTF8 OK
```

**Apply with backup (not run — no rows to fix):**

```bash
npm run mojibake:repair:db -- --apply --backup-file=backups/mojibake-repair-2026-06-03.json --limit=500
```

---

## 5. Scan results detail

### Database

- **Rows scanned:** all whitelist fields with SQL prefilter (`Ã`, `Â`, `Ä`, `á»`, `áº`, `â€`, `Æ`, `CHR(65533)`, …) then JS confidence.
- **Suspicious rows:** 0
- **High-confidence repair candidates:** 0
- **Manual review queue:** 0

### Seed / source files

- **Files scanned:** 229 under `scripts/seed`, `supabase/seed`, `lib/taxonomy/seed`, `db/migrations`, `drizzle`
- **Note:** `db/migrations/legacy/158_public_url_system.sql` contains a full Vietnamese alphabet string for slug rules; line-level repair would corrupt it — correctly **not** flagged for repair after confidence filter.

---

## 6. UI validation

Prompt 2 fixed source UI copy; local DB titles already correct Vietnamese.

| Route | Expected |
|-------|----------|
| `/discover`, `/truyen`, `/media`, `/bang-xep-hang` | Nav/shortcuts OK (source) |
| Story detail / reader | DB content OK on local sample |
| `/admin` taxonomy | `TaxonomyTermsTable.tsx` fixed in Prompt 2 (source) |

**Recommendation:** After applying repairs on an environment with real mojibake rows, re-run `npm run mojibake:scan:db` and smoke-test the routes above.

---

## 7. Production / staging usage

1. **Backup database** (pg_dump) before any `--apply`.
2. `npm run mojibake:scan:db -- --limit=500 --json > scan.json`
3. Review high/medium counts.
4. `npm run mojibake:repair:db -- --dry-run --backup-file=backups/mojibake-dryrun.json`
5. If plan looks correct:  
   `npm run mojibake:repair:db -- --apply --backup-file=backups/mojibake-repair-YYYY-MM-DD.json`
6. `npm run mojibake:scan:db` again — target 0 suspicious high-confidence leftovers.
7. Restore from backup JSON + pg_dump if anything looks wrong.

---

## 8. Manual review cases

Cases that stay **out of auto-apply**:

- `confidence: low` or `medium`
- Original contains `` (U+FFFD) — may be unrecoverable
- `episodes.content` (large body) — repair disabled in whitelist; handle via import/backfill
- Slug/URL fields — never auto-repaired
- Seed charset definition files — do not run blind file repair

---

## 9. Files added/changed (Prompt 3)

| Path | Action |
|------|--------|
| `lib/encoding/mojibake-repair.ts` | **new** |
| `lib/encoding/db-text-fields.ts` | **new** |
| `lib/encoding/db-mojibake-scan.ts` | **new** |
| `scripts/scan-mojibake-db.ts` | **new** |
| `scripts/repair-mojibake-db.ts` | **new** |
| `scripts/scan-mojibake-files.ts` | **new** |
| `package.json` | scripts `mojibake:scan:db`, `mojibake:repair:db`, `mojibake:scan:files` |
| `docs/ENCODING_DATA_REPAIR_REPORT.md` | **new** |

**Build:** not executed (per prompt constraints).

---

*No database rows were modified in this prompt run.*
