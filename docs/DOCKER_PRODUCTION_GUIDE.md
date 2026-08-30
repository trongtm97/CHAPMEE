# ChapMee — Docker production image guide

Production web image for VPS Vietnix: **Next.js 16** with `output: "standalone"` (`next.config.ts`), **pnpm**, **Node 22 Alpine**.

Related: `docs/PRODUCTION_ENV_GUIDE.md`, `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md`, `.env.production.example`.

---

## 1. Strategy

| Choice | Reason |
|--------|--------|
| **Multi-stage** | Smaller final image: no devDependencies, no full source |
| **pnpm + `--frozen-lockfile`** | Matches `pnpm-lock.yaml` (primary lockfile in repo) |
| **Standalone output** | `next.config.ts` already sets `output: "standalone"` — runner runs `node server.js`, not full `node_modules` tree |
| **Non-root user** | `chapmee` in runner stage |
| **No env files in image** | Secrets only via compose `env_file` at **runtime** |

Alternative **not** used: copying full `.next` + all `node_modules` + `pnpm start` — heavier; unnecessary while standalone is enabled.

**TODO (only if standalone removed from `next.config.ts`):** switch runner to copy `.next`, `node_modules` (prod), and `CMD ["pnpm", "start"]`.

---

## 2. Dockerfile stages

```text
base   → node:22-alpine + libc6-compat (sharp/native) + corepack
deps   → pnpm install --frozen-lockfile
builder → COPY source → pnpm build (next build --webpack)
runner → standalone + public + static + migration SQL/scripts only
```

### Runner contents

- `server.js` + traced `node_modules` from `.next/standalone`
- `public/`, `.next/static/`
- `drizzle/`, `db/`, three `scripts/db-*.mjs` for `docker compose exec` migrations

### Not in the image

- `.env`, `.env.local`, `.env.production` (blocked by `.dockerignore` and not `COPY`’d)
- Full `scripts/` tree, `docs/`, dev tooling
- Postgres / Redis / MinIO data volumes

---

## 3. Environment variables

| When | Source |
|------|--------|
| **Build** | No secrets. Default Dockerfile does not pass `ARG`/`ENV` for DB or auth. |
| **Runtime** | `docker-compose` `env_file` (e.g. `/opt/chapmee/.env.production`) injected into container process |

`process.env` is read when the **container starts**, not when the image is built.

### Build-time `NEXT_PUBLIC_*` (optional)

Some Next builds embed `NEXT_PUBLIC_*` at compile time. This Dockerfile does **not** bake them in. If static generation fails in CI/Docker build, pass only **non-secret** public vars as build-args in compose (separate prompt) — never `BETTER_AUTH_SECRET`, `DATABASE_URL`, or S3 secrets.

---

## 4. Why `.env.production` is not copied

- Images are often pushed to a registry or backed up — env files would leak credentials.
- Same image can be reused across staging/prod with different `env_file`.
- `.dockerignore` excludes `.env.production` from build context.

Use on VPS:

```bash
cp .env.production.example /opt/chapmee/.env.production
chmod 600 /opt/chapmee/.env.production
npm run env:validate -- --file /opt/chapmee/.env.production --production
```

Compose (next prompt) should mount or reference that file — not bake it into the image.

---

## 5. Build and test locally

**Not run in CI by default for this repo prompt** — when you choose to build:

```bash
# From repo root
docker build -t chapmee-app:latest .

# Run with env file (example only — use real .env.production on VPS)
docker run --rm -p 3000:3000 --env-file .env.production.example chapmee-app:latest
```

Expect placeholder `CHANGE_ME` values to break auth/DB; use a real local `.env.production` copy for a smoke test.

Requirements:

- Docker Engine 24+
- **RAM for image build:** ≥ **6 GB free** during `pnpm build` (webpack peaks ~3–4 GB heap). VPS **4 GB** often OOM unless you add **swap** or build on a stronger machine.
- Dockerfile sets `NODE_OPTIONS=--max-old-space-size=4096` in the builder stage (override via build-arg, see below).

---

## 6. Production start command

Inside the container:

```text
node server.js
```

Equivalent to Next standalone server (not `pnpm start`). Listens on `0.0.0.0:3000` (`HOSTNAME`, `PORT` in Dockerfile).

`package.json` `"start": "next start"` is for non-Docker deploys only.

---

## 7. Database migrations in container

After Postgres is up and `DATABASE_URL` is in env:

```bash
docker compose exec app node scripts/db-migrate-foundation.mjs
docker compose exec app node scripts/db-apply-legacy-migrations.mjs
docker compose exec app node scripts/db-apply-shims.mjs
```

Scripts use `pg` and read `DATABASE_URL` from the container environment (from compose), not from files in the image.

---

## 8. Health checks

`GET /api/health` — shallow JSON (`checks.server: ok`).  
`GET /api/health?deep=1` — adds DB (`SELECT 1`) and Redis ping with short timeouts.

Compose `web` service uses Docker healthcheck against `http://127.0.0.1:3000/api/health`.

Public: `curl -s https://chapmee.com/api/health` — see `docs/PRODUCTION_HEALTHCHECK.md`.

---

## 9. `.dockerignore` highlights

Ignored: `node_modules`, `.next`, `.git`, all `.env*` except nothing committed as secret, `backups/`, `coverage/`, `docs/`, local compose override, screenshots.

**Not** ignored: `app/`, `lib/`, `public/`, `drizzle/`, `db/`, `pnpm-lock.yaml`, `next.config.ts`, Tailwind/PostCSS configs.

`.env.production.example` is not needed inside the image; it stays in git for operators only.

---

## 10. Common errors

| Symptom | Likely cause |
|---------|----------------|
| `standalone` folder missing after build | `output: "standalone"` removed from `next.config.ts` — restore or change Dockerfile to non-standalone strategy |
| `pnpm: not found` | `corepack enable` missing — use current Dockerfile `base` stage |
| `Cannot find module 'sharp'` | Missing `libc6-compat` on Alpine — included in `base` stage |
| App listens on localhost only | Set `HOSTNAME=0.0.0.0` (set in runner) |
| Auth/DB errors at runtime | Env not passed — check compose `env_file`, not image build |
| Build fails on static pages | Missing build-time `NEXT_PUBLIC_*` — add documented build-args |
| **`JavaScript heap out of memory`** during `RUN pnpm build` | VPS/Docker RAM too low for webpack. See **§ Build OOM** below |
| **`ECONNREFUSED 127.0.0.1:5432`** or **`BETTER_AUTH_SECRET`** during build | Normal without DB in builder — ensure latest code with `CHAPMEE_SKIP_BUILD_TIME_DATA` and build-time guards in `lib/build/is-build-time.ts` |
| Migrations fail in container | `DATABASE_URL` wrong host — use `postgres` service name, not `localhost` |
| Image huge | Build context included `node_modules` — verify `.dockerignore` |

---

## 10b. Build OOM (`heap out of memory`)

Symptom in Docker build log:

```text
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** `next build --webpack` needs more than Node’s default ~2 GB heap. The repo Dockerfile already raises it to **4096 MB** (`NODE_MAX_OLD_SPACE_SIZE`).

**On VPS (recommended order):**

1. **Add swap** (4 GB VPS without swap often fails):

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

2. **Build only `web`** (less host contention than full stack rebuild):

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'
dcp build --no-cache web
dcp up -d
```

3. **Raise heap** if host has ≥ 8 GB RAM:

```bash
export NODE_MAX_OLD_SPACE_SIZE=6144
dcp build --no-cache web
```

Or one-shot: `dcp build --build-arg NODE_MAX_OLD_SPACE_SIZE=6144 web`

4. **Build image elsewhere** (PC/CI with 8 GB+ RAM), `docker save` / `docker load` on VPS — avoids building on a small VPS.

**Check Docker memory** (desktop): Settings → Resources → Memory ≥ 6 GB.

---

## 11. Security checklist

- [ ] `.env.production` only on VPS, mode `600`
- [ ] No secrets in `docker build` logs or `ARG` defaults
- [ ] Registry/image scan optional
- [ ] Run container as non-root (`chapmee` user)

---

## 12. Files

| File | Role |
|------|------|
| `Dockerfile` | Production multi-stage build |
| `.dockerignore` | Shrink context; block env files |
| `next.config.ts` | `output: "standalone"`, `serverExternalPackages` |
