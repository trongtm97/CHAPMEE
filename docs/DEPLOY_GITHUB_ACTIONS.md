# Deploy ChapMee — GitHub Actions → GHCR → VPS pull

CI builds the Docker image on GitHub-hosted runners (8 GB RAM). VPS **only pulls** and runs `docker-compose.prod.yml` — never `docker build` or `docker compose up --build`.

---

## Architecture

```text
push main → GitHub Actions → build → push ghcr.io/<owner>/chapmee-web
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │  Manual pull on VPS  OR  optional SSH auto-deploy │
                    └─────────────────────────┬─────────────────────────┘
                                              ▼
                              docker compose pull web && up -d
```

**Image tags (every push to `main`):**

| Tag | Use |
|-----|-----|
| `latest` | Current production |
| `<full-commit-sha>` | Rollback to exact commit (40-char git SHA) |

Example: `ghcr.io/myorg/chapmee-web:abc123def456...`

---

## 1. GitHub repository setup

### A. Enable GHCR

1. Repo → **Settings** → **Actions** → **General** → Workflow permissions: **Read and write**.
2. Packages will appear under **Packages** after first successful workflow run.

### B. Repository variables (public build-args — not secrets)

**Settings → Secrets and variables → Actions → Variables**

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://chapmee.com` | Baked into client bundle at build |
| `NEXT_PUBLIC_SITE_URL` | `https://chapmee.com` | Same |
| `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL` | `https://media.chapmee.com` | Same |
| `VPS_APP_PATH` | `/opt/chapmee/app` | Deploy script path (optional) |
| `AUTO_DEPLOY_VPS` | `true` | Auto SSH deploy on every `main` push (optional) |

Workflow uses defaults if variables are unset.

### C. GitHub Secrets (never commit to repo)

**Settings → Secrets and variables → Actions → Secrets**

| Secret | Required | Description |
|--------|----------|-------------|
| `GITHUB_TOKEN` | Auto | Provided by Actions; used to push to GHCR (`packages: write`) |
| `GHCR_PULL_TOKEN` | VPS pull / auto-deploy | PAT classic with `read:packages` — for VPS `docker login` and CI deploy |
| `VPS_HOST` | Auto-deploy only | VPS IP or hostname |
| `VPS_USER` | Auto-deploy only | SSH user (e.g. `deploy`) |
| `VPS_SSH_PRIVATE_KEY` | Auto-deploy only | Private key (no passphrase recommended) |
| `VPS_SSH_PORT` | Optional | Default `22` |

#### Create `GHCR_PULL_TOKEN` (PAT)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. Fine-grained or classic with scope **`read:packages`** (and `repo` if private package).
3. Store as secret `GHCR_PULL_TOKEN` in the repo **and** use on VPS for `docker login`.

#### Create deploy SSH key

```bash
ssh-keygen -t ed25519 -C "github-actions-chapmee" -f chapmee-deploy -N ""
# Add chapmee-deploy.pub to VPS ~/.ssh/authorized_keys
# Paste chapmee-deploy private key into secret VPS_SSH_PRIVATE_KEY
```

### D. Docker Hub (alternative — optional)

To push to Docker Hub instead of or in addition to GHCR, add secrets:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub user |
| `DOCKERHUB_TOKEN` | Access token |

Extend `.github/workflows/docker-publish.yml` with a second `docker/login-action` and extra tags — GHCR is the default in this repo.

---

## 2. VPS one-time setup

```bash
sudo mkdir -p /opt/chapmee/app
cd /opt/chapmee/app

# Compose + Caddy + env (from git or manual copy)
git clone <YOUR_REPO_URL> .
cp .env.production.example .env.production
# Edit secrets on VPS only — NEVER commit .env.production

# Login to GHCR (use PAT with read:packages)
echo "YOUR_GHCR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Set image (updated by deploy script / CI)
echo "CHAPMEE_WEB_IMAGE=ghcr.io/YOUR_ORG/chapmee-web:latest" >> .env.production
```

Make package public **or** keep private and always use `docker login` on VPS.

---

## 3. Deploy on VPS (manual pull)

After GitHub Actions succeeds on `main`:

```bash
cd /opt/chapmee/app

# Option A — pull latest
export CHAPMEE_WEB_IMAGE=ghcr.io/YOUR_ORG/chapmee-web:latest
./scripts/deploy/vps-pull-deploy.sh

# Option B — explicit compose commands (NO --build)
docker compose -f docker-compose.prod.yml --env-file .env.production pull web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

docker ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web
curl -s http://127.0.0.1:3000/api/health
```

### Rollback to a commit SHA

Find SHA from GitHub → Actions → workflow run, or `git log -1 --format=%H`:

```bash
cd /opt/chapmee/app
./scripts/deploy/vps-pull-deploy.sh ghcr.io/YOUR_ORG/chapmee-web:abc123def4567890...
```

Or:

```bash
sed -i 's|^CHAPMEE_WEB_IMAGE=.*|CHAPMEE_WEB_IMAGE=ghcr.io/YOUR_ORG/chapmee-web:<sha>|' .env.production
docker compose -f docker-compose.prod.yml --env-file .env.production pull web
docker compose -f docker-compose.prod.yml --env-file .env.production up -d web
```

Rollback tag saved in `.deploy-rollback-image` on each deploy.

---

## 4. Auto deploy via GitHub Actions (optional)

1. Add secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `GHCR_PULL_TOKEN`.
2. Either:
   - Set repository variable `AUTO_DEPLOY_VPS=true`, **or**
   - Run workflow manually: **Actions** → **Docker publish** → **Run workflow** → check **Deploy to VPS**.

Deploy job will SSH, update `CHAPMEE_WEB_IMAGE` to `ghcr.io/<owner>/chapmee-web:<sha>`, `pull`, `up -d`, health check, safe prune.

---

## 5. Safe image cleanup on VPS

```bash
cd /opt/chapmee/app
IMAGE_REPO=ghcr.io/YOUR_ORG/chapmee-web KEEP_IMAGE_TAGS=5 ./scripts/deploy/vps-prune-images.sh
```

Rules:

- `docker image prune -f` — dangling layers only
- Never removes image used by running `chapmee-web` container
- Never removes tag in `.deploy-rollback-image`
- Keeps last 5 commit-SHA tags; removes older SHA tags

---

## 6. Security checklist

- [ ] `.env.production` exists **only on VPS** (in `.gitignore`, in `.dockerignore`)
- [ ] No production secrets in GitHub repo
- [ ] `NEXT_PUBLIC_*` in GitHub **Variables** (public by design)
- [ ] `BETTER_AUTH_SECRET`, `DATABASE_URL`, S3 keys **only** in VPS `.env.production`
- [ ] `GHCR_PULL_TOKEN` is read-only (`read:packages`)
- [ ] Deploy SSH key is dedicated, not your personal key
- [ ] GHCR package visibility reviewed (public vs private)

---

## 7. Forbidden on VPS

```bash
docker build .                              # ❌
docker compose build                        # ❌
docker compose up -d --build                # ❌
docker compose down -v                      # ❌ destroys DB volumes
```

---

## 8. Files

| File | Role |
|------|------|
| `.github/workflows/docker-publish.yml` | Build + push GHCR; optional SSH deploy |
| `docker-compose.prod.yml` | Production stack (`image:` + `pull_policy: always`) |
| `scripts/deploy/vps-pull-deploy.sh` | Manual pull + up + health + prune |
| `scripts/deploy/vps-prune-images.sh` | Safe cleanup of old SHA tags |
| `docs/DEPLOY_IMAGE_SAVE_LOAD.md` | Alternative: docker save/load without registry |
