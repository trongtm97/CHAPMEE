# Custom Code / Snippet Manager

Admin-managed **frontend-only** snippets (WPCode-style, hardened for Next.js). No server-side execution, no DB/API access from snippet code.

## Admin

- List: `/admin/developer/snippets`
- Permissions (RBAC): `admin.snippets.*` — granted to `super_admin` and `owner` by migration `drizzle/0028_code_snippets.sql`
- Legacy `founder` profile role includes snippet permissions in `lib/auth/permissions.ts`

## Snippet types

| Type | Injection |
|------|-----------|
| `custom_css` | `<style>` in body (scoped by route filters) |
| `head_script` | `<script>` / `<meta>` / `<link>` hoặc JS thuần → parse và inject (meta/link luôn vào `<head>`) |
| `body_start_script` | Giống `head_script`, script vào đầu `<body>` |
| `footer_script` | Giống `head_script`, script vào cuối `<body>` |
| `safe_html` | HTML body; `<meta>`/`<link>` tách sang `<head>` |

## Safe mode (kill switch)

1. **Environment:** `CHAPMEE_DISABLE_SNIPPETS=true` — hard off for all instances.
2. **Database:** `app_settings.key = code_snippet_settings` → `{ "snippets_enabled": false }`.
3. **Admin UI:** “Tắt toàn bộ snippet” on the snippets list page.

When safe mode is on, the public site renders **no** snippets; admin can still edit records.

## Default excluded routes

Snippets do not run on:

- `/admin/*`, `/studio/*`, `/login`, `/register`, `/payment/*`, `/messages/*`, `/me`, `/checkout`, `/coin`, `/wallet`, `/onboarding`, `/write`

Legal routes (`/privacy`, `/terms`, `/legal/*`, …) allow only `custom_css` and `safe_html` unless placement config overrides.

## Validation

- Size limit: 64 KiB per snippet.
- CSS: blocks `expression()`, `javascript:`, etc.; warns on `@import`.
- Scripts: blocks `eval` / `new Function`; warns on cookie/storage/fetch/XHR (super-admin confirm).
- `safe_html`: strips scripts, iframes, forms, event attributes.

## Versioning & audit

- Every save creates `code_snippet_versions`.
- Rollback restores code/config and sets status `inactive`.
- `code_snippet_audit_logs` plus `admin_audit_logs` via `snippet.*` actions.

## Import / export

JSON bundle `version: 1`. Imported rows are always **draft**; never auto-activated.

## CSP note

Inline scripts are injected client-side with `text` content (no `eval`). This is equivalent to third-party tag managers and may require CSP exceptions if you tighten `script-src`. Document any CSP change before production.

## Local test

```bash
npm run db:migrate
# Create active CSS snippet for /bai-viet — verify not on /admin
# Toggle safe mode — verify snippets disappear
```
