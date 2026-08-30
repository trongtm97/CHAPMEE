# ChapMee Encoding Standard (UTF-8)

ChapMee uses **UTF-8 end-to-end** for Vietnamese and all display text.

## Rules

| Layer | Requirement |
|-------|-------------|
| **Source files** | Save as UTF-8 (no BOM in `.ts`/`.tsx`). See repo `.editorconfig`. |
| **Display text** | Keep full Unicode diacritics (`Truyện sáng tác`, `Khám phá`, …). |
| **Slugs / usernames** | Only slugs and usernames may strip accents (existing slugify helpers). |
| **PostgreSQL** | Database and client encoding **UTF8**. |
| **HTTP JSON** | `application/json; charset=utf-8` when setting `Content-Type` explicitly. |
| **HTTP CSV** | `text/csv; charset=utf-8`; optional UTF-8 BOM **only** on CSV **export** for Excel. |
| **Node fs** | `readFile` / `writeFile` with `"utf8"` for text. |
| **Import pipeline** | Decode uploads as UTF-8; reject/warn on mojibake before persisting. |

## Product copy (preferred labels)

Use full phrases where applicable:

- Truyện sáng tác / Truyện dịch (not shortened “Sáng tác” alone in nav)
- Khám phá, Cộng đồng, Bảng xếp hạng
- Danh mục truyện, Đọc truyện, Nghe audio, Xem video

## Checks

```bash
npm run encoding:check          # report suspicious source files
npm run encoding:check -- --strict   # exit 1 on any hit
npm run encoding:check -- --json

npm run db:encoding             # read server/client encoding (needs DATABASE_URL)

npm run mojibake:scan:db -- --limit=100    # scan DB text fields (read-only)
npm run mojibake:repair:db -- --dry-run      # plan repairs, no writes
npm run mojibake:scan:files                  # scan seed/SQL/JSON sources
```

DB repair apply (requires backup path):

```bash
npm run mojibake:repair:db -- --apply --backup-file=backups/mojibake-repair-YYYY-MM-DD.json
```

See [ENCODING_DATA_REPAIR_REPORT.md](./ENCODING_DATA_REPAIR_REPORT.md).

Legacy byte repair (invalid UTF-8 only):

```bash
node scripts/repair-source-encoding.mjs --check
```

## When mojibake appears

Typical signatures: mojibake like Latin-1 misread UTF-8 (see `lib/encoding/patterns.ts`).

1. Run `npm run encoding:check`.
2. Fix the **source file** with correct Vietnamese (do not blind replace).
3. For DB rows already wrong, use the **Prompt 3** dry-run repair script (not bulk fixes in app code).

## Import uploads

- Export templates as UTF-8 from Excel (CSV UTF-8 or “Unicode” export).
- Import runner validates text for mojibake before parse/publish.
- Do not run `latin1` unless converting legacy input with an explicit, documented conversion step.

## Related docs

- [ENCODING_AUDIT_REPORT.md](./ENCODING_AUDIT_REPORT.md) — Prompt 1 findings
