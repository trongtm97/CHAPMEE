# ChapMee

ChapMee is a mobile-first PWA for text entertainment: Reels, Discover, Community, Creator Studio, and Admin operations.

## Tech stack (self-hosted)

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** + legacy schema from `db/migrations/legacy/`
- **Drizzle** — Better Auth tables + direct SQL where needed
- **Better Auth** — email/password (replaces Supabase Auth)
- **Google OAuth** — optional Better Auth social login for web/PWA
- **PostgREST** — compatibility layer for legacy `.from()` / `.rpc()` queries
- **S3-compatible storage** — MinIO (local) / Vietnix Object Storage (production)

Runtime code does **not** depend on `@supabase/supabase-js`.

## Quick start (local)

See **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for the full checklist.

```bash
npm install --legacy-peer-deps
docker compose -f docker-compose.local.yml up -d
cp .env.example .env.local   # set BETTER_AUTH_SECRET, DATABASE_URL, S3_*
npm run db:migrate
npm run db:legacy            # first time only (~197 migrations)
npm run verify:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` → `.env.local`. Required:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `BETTER_AUTH_SECRET` | Auth signing (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in for `/login` and `/register` |
| `POSTGREST_URL` / `NEXT_PUBLIC_POSTGREST_URL` | `http://127.0.0.1:54321` |
| `S3_*` | MinIO or production object storage |

Do **not** commit `.env.local`.

## Deploy (Vietnix VPS)

See **[DEPLOY_VIETNIX.md](./DEPLOY_VIETNIX.md)**.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Drizzle SQL `0000`–`0011` (tracked in `schema_migrations`) |
| `npm run db:migrate:status` | List applied / pending drizzle files |
| `npm run db:legacy` | Apply `db/migrations/legacy/` |
| `npm run db:setup` | migrate + legacy + shims |
| `npm run db:seed` | Demo users + sample stories (local) |
| `npm run db:repair-auth-users` | Backfill `auth.users` + `profiles` |
| `npm run verify:local` | Health check stack |
| `npm run test:rbac:setup` | RBAC test users (needs `DATABASE_URL`) |

### Chapter content (S3) & import

| Script | Description |
|--------|-------------|
| `npm run test:chapter-content` | MinIO save/load smoke test |
| `npm run backfill:chapter-content` | Migrate inline `episodes.content` → S3 |
| `npm run import:local-file` | CLI upload/parse import file |
| `npm run import:cleanup` | List old failed import jobs (dry-run) |

### Storage ops (search/cache lifecycle)

| Script | Description |
|--------|-------------|
| `npm run storage:health` | Schema + optional S3 probe |
| `npm run storage:check-chapters` | Verify chapter objects in bucket |
| `npm run storage:check-imports` | Verify import raw/processed keys |
| `npm run storage:cleanup-import-temp` | Dry-run import temp cleanup |
| `npm run storage:cleanup-orphan-chapters` | Dry-run orphan chapter report |

Docs: [OPERATIONS_STORAGE.md](./docs/OPERATIONS_STORAGE.md) (runbook), [STORAGE_LIFECYCLE.md](./docs/STORAGE_LIFECYCLE.md), [IMPORT_PIPELINE.md](./docs/IMPORT_PIPELINE.md), [CHAPTER_CONTENT_STORAGE_PLAN.md](./docs/CHAPTER_CONTENT_STORAGE_PLAN.md).

Admin: `/admin/storage`, `/admin/imports`, `/admin/storage-cleanup`.

## Validation

```bash
npm run lint
npm run build
```

Run `npm run typecheck` before commits; production build enforces types (`ignoreBuildErrors: false`).

## Google OAuth setup

If you want Google sign-in on `/login` and `/register`:

1. Create a Google OAuth Client in Google Cloud Console.
2. Choose `Web application`.
3. Add redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://YOUR_DOMAIN/api/auth/callback/google`
4. Fill these env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `APP_URL`
   - `BETTER_AUTH_URL`
   - `BETTER_AUTH_SECRET` or `AUTH_SECRET`

ChapMee only requests `openid`, `email`, and `profile`.

## Project layout

- `app/` — routes and API
- `lib/db/` — Drizzle, PostgREST compat client
- `lib/auth/` — Better Auth + `auth.users` shim
- `lib/data/` — PostgREST data access modules (queries, settings, monetization, …)
- `db/migrations/legacy/` — SQL migrations (applied via `npm run db:legacy`)
- `drizzle/` — foundation SQL for auth + shims
