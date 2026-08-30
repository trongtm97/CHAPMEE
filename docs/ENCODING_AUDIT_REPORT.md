# Encoding Audit Report — ChapMee

**Date:** 2026-06-03  
**Scope:** Audit only — no data fixes, no mass replace, no `pnpm build`.  
**Goal:** Find root cause of Vietnamese text corruption (mojibake and `?` substitution).

---

## Executive summary

| Layer | Status | Notes |
|-------|--------|-------|
| **Source files (UTF-8 validity)** | Pass | `node scripts/repair-source-encoding.mjs --check` → no invalid UTF-8 byte sequences |
| **Source files (Vietnamese content)** | **Fail** | Two corruption patterns in repo; ~20 TS/TSX files affected |
| **Navigation / Discover / public catalog copy** | Pass | `lib/navigation/nav-items.ts`, `lib/discover/discover-shortcuts.ts`, reader UI samples are correct UTF-8 Vietnamese |
| **Local PostgreSQL** | Pass | `server_encoding` / `client_encoding` = UTF8; sampled story titles correct; 0 rows matching mojibake grep in `stories`, `taxonomy_terms`, `episodes`, `seo_content_blocks` |
| **HTTP/HTML/API charset** | Mostly OK | Next.js root layout `lang="vi"`; CSV/XML exports set `charset=utf-8`; JSON routes rely on framework defaults |
| **Project UTF-8 guardrails** | **Gap** | No `.editorconfig`; `repair-source-encoding.mjs` exists but is not wired in `package.json` |

**Primary root cause (ranked):**

1. **Corrupted source strings in Git** — not a runtime charset misconfiguration. Most user-visible breakage on admin/studio/reels paths comes from **hard-coded UI/error copy** saved with `?` instead of diacritics, plus one admin file with **classic mojibake** (UTF-8 bytes historically misinterpreted as Latin-1/Windows-1252).
2. **No evidence of DB-wide mojibake** on local `chapmee_local` for the patterns tested.
3. **Import pipeline** assumes UTF-8 for raw files (`rawBuffer.toString("utf8")`) — a separate risk for **future** bad uploads (Windows-1258 / CP1252), not the main cause of current nav/discover issues.

---

## 1. Source file audit

### 1.1 UTF-8 validity (bytes)

| Check | Result |
|-------|--------|
| `scripts/repair-source-encoding.mjs --check` over `lib/`, `app/`, `components/`, `scripts/` | **0 invalid UTF-8 files** |
| BOM | Import parser strips `\uFEFF` only (`lib/import/pipeline/import-parser.ts`); no systematic BOM scan across repo |
| Replacement character `` | Not systematically scanned; mojibake/`?` patterns used instead |

All corrupted files are **valid UTF-8** — corruption is **wrong characters**, not invalid byte sequences. The repair script will **not** fix them automatically.

### 1.2 Pattern A — Mojibake (UTF-8 misread as Latin-1)

**Signature:** `Ã`, `Â`, `Ä‘`, `áº`, `á»`, `Truyá»‡n`, `KhÃ¡m`, `SÃ¡ng`, `CÃ³`, `KhÃ´ng`, broken symbols `âœ"`, `â€"`

| File | Match count (grep) | Example (as in file) | Correct (intended) |
|------|-------------------|----------------------|-------------------|
| `components/admin/taxonomy/TaxonomyTermsTable.tsx` | ~77 lines | `CÃ³`, `KhÃ´ng`, `Truyá»‡n`, `TÃ¬m`, `Bá»™ lá»c` | Có, Không, Truyện, Tìm, Bộ lọc |

**Only one file** in the repo matches mojibake search patterns across `.ts/.tsx/.js/.json/.md/.sql/.csv`.

Present in **last commit** (`git show HEAD:...`) — not introduced only in the working tree.

### 1.3 Pattern B — Diacritic loss (`?` substitution)

**Signature:** Vietnamese letters replaced by ASCII `?`, e.g. `quy?n`, `truy?n`, `thi?u`, `?nh`, `d?c`, `Ch?n`, `B? sung`, `B?n`, `nh?p`, `ngu?i`, `truy c?p`, `Không t?i`

These are **not** mojibake; they are **valid UTF-8** strings with wrong content (typical of save/export through a charset that cannot represent Vietnamese, or manual corruption).

| File | Role |
|------|------|
| `app/admin/bonus-pools/page.tsx` | Admin guard copy |
| `app/admin/campaigns/page.tsx` | Admin guard copy |
| `app/admin/growth/page.tsx` | Admin guard copy |
| `app/admin/monetization/page.tsx` | Admin guard copy |
| `app/admin/payments/page.tsx` | Admin guard copy |
| `app/admin/payouts/page.tsx` | Admin guard copy |
| `app/admin/risk/page.tsx` | Admin guard copy |
| `components/admin/UserRoleManager.tsx` | Admin UX copy |
| `lib/creator/get-creator-dashboard.ts` | Studio/creator insights (~33 hits) |
| `lib/studio/get-studio-analytics.ts` | Studio analytics (~18 hits) |
| `lib/studio/scheduling/scheduling-actions.ts` | Studio scheduling errors |
| `lib/studio/scheduling/schedule-publication.ts` | Publish validation |
| `lib/studio/scheduling/publish-target.ts` | Publish target errors |
| `lib/studio/scheduling/publish-scheduled-items.ts` | Scheduled publish |
| `lib/reels/reels-actions.ts` | Reels actions |
| `lib/reels/reels-item-mutations.ts` | Reels mutations |
| `lib/reels/publish-reels-item.ts` | Reels publish |
| `lib/reels/assert-reels-ownership.ts` | Ownership errors |
| `lib/reels/getReelsItems.ts` | Reels empty state |
| `lib/reels/get-creator-reels-items.ts` | Creator reels (verify if only ASCII-unaccented, not `?`) |

Also present in **HEAD** for admin pages (e.g. `app/admin/bonus-pools/page.tsx` → `quy?n truy c?p`).

**Not classified as corruption:** strings like `Story nay chua du dieu kien nhan tips.` in `lib/monetization/tips.ts` — unaccented ASCII Vietnamese, not `?` mojibake.

### 1.4 Files inspected vs. clean (high-traffic Vietnamese UI)

| Area | Representative files | Vietnamese text |
|------|---------------------|-----------------|
| Navigation | `lib/navigation/nav-items.ts` | OK — `Truyện sáng tác`, `Khám phá`, `Bảng xếp hạng` |
| Discover | `app/discover/page.tsx`, `lib/discover/discover-shortcuts.ts` | OK |
| Reader | `components/reader/ReaderToolbar.tsx`, `ReaderEndNavigation.tsx` | OK |
| Footer defaults | `lib/settings/footer-config.ts` | OK |
| Taxonomy seed | `lib/taxonomy/seed/default-terms.ts` | OK |
| SEO audit messages | `lib/seo/audit.ts` | OK |

If users report `Truyá»‡n` / `KhÃ¡m phÃ¡` on **main nav or /discover**, cause is unlikely to be these files unless another layer overrides (CDN, browser extension, proxy). Match symptoms to **admin taxonomy table** or **DB/API** separately.

---

## 2. Config audit

| Item | Present | UTF-8 / locale notes |
|------|---------|----------------------|
| `.editorconfig` | **No** | Recommend adding in Prompt 2 (`charset = utf-8`, `end_of_line = lf`) |
| `tsconfig.json` | Yes | No explicit charset (normal for TS) |
| `next.config.ts` | Yes | No charset override; cache headers only for `/brand/*`, favicon |
| `.prettierrc` | Yes | No encoding option |
| `.vscode/settings.json` | **Not in repo** | Team editors may use inconsistent `files.encoding` |
| `Dockerfile` | Yes | `node:22-alpine`; no `LANG`/`LC_ALL` — Node defaults UTF-8 |
| `docker-compose.local.yml` | Yes | `postgres:17`; no explicit `POSTGRES_INITDB_ARGS` — image defaults to UTF8 |
| `drizzle.config.ts` | Yes | Standard PostgreSQL URL |
| `lib/db/pool.ts` | Yes | No `client_encoding` option — relies on server UTF8 |
| `package.json` | Yes | **No** script for `repair-source-encoding.mjs` |
| `scripts/repair-source-encoding.mjs` | Yes | Repairs **invalid UTF-8 bytes** only; does not fix mojibake or `?` loss |

---

## 3. HTML / HTTP charset audit

| Surface | Finding |
|---------|---------|
| `app/layout.tsx` | `<html lang="vi">`; no explicit `<meta charset>` — **Next.js App Router sets UTF-8** on HTML responses by default |
| `proxy.ts` | SEO redirects / admin auth; **no** `Content-Type` charset manipulation |
| `middleware.ts` | **Not present** |
| API JSON (`app/api/**`) | Typically `NextResponse.json()` without explicit charset — browsers treat as UTF-8 |
| CSV exports | `text/csv; charset=utf-8` — e.g. `app/api/admin/finance/export/route.ts`, creator statement, ad revenue exports |
| XML | `app/pinterest-feed.xml/route.ts` — `application/xml; charset=utf-8`, `encoding="UTF-8"` in XML decl |
| Sitemap | `lib/seo/sitemap-service.ts` — UTF-8 in XML declaration |
| Chapter blob types | `lib/content/chapter-content-utils.ts` — `text/plain; charset=utf-8`, `application/json; charset=utf-8` for stored formats |
| Client CSV/JSON downloads | Multiple admin components use `Blob` with `charset=utf-8` |

**Gap:** No global policy document requiring `charset=utf-8` on custom `new Response()` / rare `text/html` handlers — spot checks look fine.

---

## 4. Database encoding audit (local)

**Environment:** Docker `chapmee-local-postgres`, DB `chapmee_local`.

```sql
SHOW server_encoding;  -- UTF8
SHOW client_encoding;  -- UTF8
SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database();  -- UTF8
```

| Table / check | Mojibake pattern grep (`%Ã%`, `%á»%`, etc.) | Sample data |
|---------------|---------------------------------------------|-------------|
| `stories.title`, `short_description` | 0 | `Hợp Đồng Lúc 0 Giờ`, `Tin Nhắn Từ Phòng 404` — correct |
| `taxonomy_terms.name` | 0 | — |
| `episodes.title`, `plain_text_preview` | 0 | — |
| `seo_content_blocks` (`title`, `content_markdown`) | 0 | — |

**Conclusion:** Local DB content inspected does **not** explain site-wide nav mojibake. Production DB was **not** queried in this audit.

**Code path:** `pg` pool uses `DATABASE_URL` with no explicit `client_encoding`; PostgreSQL negotiates UTF8.

---

## 5. Seed / import / export audit

| Path | Encoding behavior | Risk |
|------|-------------------|------|
| `scripts/seed/run-sql-file.ts` | `readFileSync(..., "utf8")` | Low if SQL files are UTF-8 |
| `scripts/import-local-file.ts` | `readFileSync(abs)` **without encoding** → Buffer; parse uses `utf8` in runner | **Medium** — binary read is fine, but `import-runner.ts` always `rawBuffer.toString("utf8")` |
| `lib/import/pipeline/import-parser.ts` | Strips BOM; JSON/text parse | Low for UTF-8 inputs |
| `lib/import/pipeline/import-storage.ts` | gzip + `gunzip → utf8` | Low |
| `lib/taxonomy/import-export/parse-file.ts` | CSV string; XLSX via `xlsx` buffer | **Medium** — Excel/CSV from Excel on Windows may be CP1258 unless exported UTF-8 |
| Taxonomy client export | `Blob` / `charset=utf-8` in admin UI | Low |
| `scripts/generate-taxonomy-seed-sql.ts` | `writeFileSync(..., "utf8")` | Low |
| `lib/taxonomy/seed/default-terms.ts` | Source UTF-8 Vietnamese | OK |

No `latin1` / `win1258` usage in app code except **`scripts/repair-source-encoding.mjs`** (intentional Latin-1 **byte** repair map for invalid UTF-8).

---

## 6. UI routes — symptoms vs. source

| Route | Expected symptom | Likely source |
|-------|------------------|---------------|
| `/`, `/discover`, `/truyen`, `/media`, `/bang-xep-hang` | Should show correct Vietnamese in nav/shortcuts | **Source OK** (`nav-items`, `discover-shortcuts`) |
| Reader `/truyen/.../chuong/...` | Toolbar/end copy OK in source | **Source OK**; chapter body from DB/S3 |
| `/me` | Profile copy OK in sampled files | DB display names — local DB OK |
| `/studio`, `/studio/analytics` | Broken hints if using `get-studio-analytics.ts` | **Source `?` corruption** |
| `/admin/*` (payments, risk, …) | `quy?n truy c?p`, `Không t?i...` | **Source `?` corruption** |
| `/admin` taxonomy terms table | Full mojibake UI | **`TaxonomyTermsTable.tsx` only** |
| SEO content blocks | From DB | Local DB: no mojibake hits |

---

## 7. Root cause candidates

| # | Hypothesis | Evidence | Likelihood |
|---|------------|----------|------------|
| 1 | **Batch corruption of TS/TSX string literals** (editor save as ANSI / tool stripping diacritics) | Many files in `app/admin/*`, `lib/creator/*`, `lib/studio/*`, `lib/reels/*`; valid UTF-8 with `?`; present in HEAD | **High** |
| 2 | **Single file Latin-1 misinterpretation** | Only `TaxonomyTermsTable.tsx` mojibake; in HEAD | **High** (localized) |
| 3 | PostgreSQL wrong encoding | Local UTF8; content samples correct | **Low** (local) |
| 4 | Missing HTML charset | Next.js defaults | **Low** |
| 5 | Import mis-decoding uploaded files | Would affect **imported** chapter/taxonomy rows, not static nav labels | **Medium** for imports only |
| 6 | `repair-source-encoding.mjs` run on valid UTF-8 | Script only touches **invalid** UTF-8; check passed | **Low** |

---

## 8. Safe fix plan (Prompt 2+ — do not run in this audit)

### Phase A — Source truth (no DB writes)

1. Add **`.editorconfig`** with `charset = utf-8`, `insert_final_newline = true`, `end_of_line = lf`.
2. Add **`package.json` script**: `"encoding:check": "node scripts/repair-source-encoding.mjs --check"`.
3. Fix **`TaxonomyTermsTable.tsx`** by restoring Vietnamese strings (from git history before corruption, or manual fix from mojibake — e.g. `CÃ³` → `Có`). **One file, review in PR**.
4. Fix **`?` substitution files** (~20) in small PRs by area: `app/admin/*` → `lib/studio/*` → `lib/reels/*` → `lib/creator/*`. Use side-by-side diff; do not blind `sed`.
5. Optional: extend check script to grep for `quy\?n|CÃ³|Truyá»‡n` in CI (no new heavy deps).

### Phase B — Verify runtime (read-only)

1. Re-run mojibake grep after fixes.
2. Manual smoke: `/discover`, `/admin` taxonomy, `/studio/analytics`, one reader chapter.
3. Production DB (read-only):  
   `SELECT count(*) FROM stories WHERE title ~ '[ÃÂÄ]' OR title LIKE '%?%';`  
   Tune regex to avoid false positives.

### Phase C — Import hardening (optional)

1. Detect UTF-8 validity on upload; if invalid, try `iconv-lite` or reject with clear error (only if product agrees).
2. Document: export CSV as **UTF-8 with BOM** from Excel for taxonomy imports.
3. Keep `import-local-file` as Buffer + explicit decode after detection.

### Phase D — Data repair (only if DB audit finds issues)

1. Backup first.
2. Fix rows with known-good source (re-import or SQL `UPDATE` from corrected export).
3. **Not needed on local** for patterns tested.

---

## 9. Validation performed

| Step | Done |
|------|------|
| `git status` | Yes — large WIP tree; audit doc is new only |
| Mojibake grep (`Ã`, `KhÃ`, `Truyá`, …) | Yes |
| `?`-corruption grep | Yes |
| `repair-source-encoding.mjs --check` | Yes — 0 invalid UTF-8 |
| Config review | Yes |
| DB encoding + content sample (Docker) | Yes |
| `pnpm build` | **Not run** (per constraints) |
| Live browser pass on all routes | Not exhaustive — source/DB evidence used |

---

## 10. Files inspected (summary counts)

| Category | Approx. count |
|----------|----------------|
| Text extensions scanned via grep | All tracked `.ts/.tsx/.js/.jsx/.json/.md/.mdx/.sql/.csv/.txt` under repo |
| Invalid UTF-8 | 0 |
| Mojibake files | **1** |
| `?` diacritic-loss files | **~20** |
| DB tables spot-checked | 4 |
| Config files read | 8+ |

---

## 11. Next steps (recommended order)

1. **Prompt 2:** Add `.editorconfig` + `encoding:check` npm script + CI grep for known bad patterns.
2. **Prompt 3:** PR fixing `TaxonomyTermsTable.tsx` (mojibake).
3. **Prompt 4:** PR batch-fix admin pages (`quy?n` → `quyền`, etc.).
4. **Prompt 5:** PR batch-fix studio/reels/creator libs.
5. **Optional:** Production DB read-only audit with same grep patterns.
6. **Optional:** Import UTF-8 detection on upload.

---

*Report generated by encoding audit (read-only). No database or source content was modified.*
