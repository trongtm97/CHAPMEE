# Infrastructure migration (Supabase → self-hosted)

Status as of branch `infra/remove-supabase-vietnix`.

## Done

- [x] PostgreSQL + Docker Compose (local + production template)
- [x] Drizzle foundation + Better Auth (`user`, `session`, `account`)
- [x] `auth.users` shim + `syncAuthUserShim` + profile hook on signup
- [x] PostgREST compat client (`lib/db/postgrest/*`, `lib/data/*`)
- [x] PostgREST JWT for session RLS (`POSTGREST_JWT_SECRET`, `lib/auth/postgrest-jwt.ts`)
- [x] Server `createClient()` sends user JWT; admin uses `service_role` JWT
- [x] S3 presign/complete media APIs
- [x] `auth.admin` compat (incl. `updateUserById`)
- [x] Legacy SQL migrations via `npm run db:legacy`
- [x] Production `Dockerfile`, `DEPLOY_VIETNIX.md`, backup script
- [x] No runtime `@supabase/supabase-js` in app code
- [x] PostgREST filter encoding fix (timestamptz / Reels feed)
- [x] RBAC scripts: `test:rbac:setup` + `test:rbac` (tsx, no Supabase SDK)
- [x] Local seed: `npm run db:seed` (demo users + `db/seed.sql` content)

## Large content storage (chapter S3 + import + search)

- [x] Drizzle `0008`–`0010` — episode S3 columns, import tables, episode FTS
- [x] Chapter body in MinIO (`story-content/…`), reader deferred S3 for paid gate
- [x] Import pipeline (`/admin/imports`, CLI `import:local-file`)
- [x] Search on DB metadata / `plain_text_preview` (no S3 body reads)
- [x] Redis optional chapter cache (`REDIS_URL`)
- [x] Ops scripts: `storage:health`, `storage:check-*`, `backfill:chapter-content`
- [x] Docs: [docs/OPERATIONS_STORAGE.md](./docs/OPERATIONS_STORAGE.md), [docs/STORAGE_LIFECYCLE.md](./docs/STORAGE_LIFECYCLE.md)

```bash
npm run db:migrate
npm run db:migrate:status
npm run storage:health
```

## Follow-up

- [x] TypeScript strict build (`typescript.ignoreBuildErrors: false`, `npm run typecheck` passes)
- [ ] Realtime (messages) — channel stub only; needs SSE/WebSocket or pg LISTEN
- [ ] Media cleanup cron (see `scripts/media-cleanup-todo.md`)
- [x] `storage:scheduled-dry-run` + `storage_integrity_runs` (0011) + admin last-check UI
- [x] Rename `lib/supabase/*` → `lib/data/*`; SQL migrations → `db/migrations/legacy/`
- [ ] Production `docker-compose.yml` PostgREST JWT + Caddy (see `DEPLOY_VIETNIX.md`)

## Commands

```bash
docker compose -f docker-compose.local.yml up -d --force-recreate postgrest   # after JWT env change
npm run db:migrate && npm run db:legacy && npm run db:shims
npm run db:seed
npm run db:repair-auth-users
npm run verify:local
npm run dev
npm run test:rbac:setup && npm run test:rbac
```

## Acceptance (MVP)

| Item | Status |
|------|--------|
| Local Docker stack | OK |
| Register / login | OK |
| Admin user create | OK |
| `npm run build` | OK (types ignored) |
| Main feeds / PostgREST RLS | OK with JWT secret configured |
| RBAC automated tests | OK after `test:rbac:setup` |
