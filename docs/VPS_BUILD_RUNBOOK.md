# ChapMee — Build & deploy lên VPS Vietnix

> ## ⛔ Ghi nhớ cho mọi lần deploy (2026-06-19)
>
> **VPS không đủ RAM → KHÔNG `docker build` trên VPS.**
>
> **Luôn:** build image trên **máy local** (Docker Desktop) → `docker save` → `scp` → VPS `docker load` → `docker compose -f docker-compose.prod.yml up -d` (**không** `--build`).
>
> **Lệnh một dòng:** `npm run deploy:vps` (xem biến env bên dưới).
>
> Agent / dev **không** upload tarball source để build trên VPS trừ khi không có Docker local.

Runbook đã verify trên VPS `deploy@14.225.211.205`, thư mục app `/opt/chapmee/app`.

## Deploy nhanh (mặc định — Windows + Docker Desktop)

**Bắt buộc:** build image trên máy dev, upload lên VPS — **~8–15 phút**, không build Next.js trên VPS 4GB.

```powershell
$env:VPS_USER = "deploy"
$env:VPS_HOST = "14.225.211.205"
$env:VPS_PATH = "/opt/chapmee/app"
$env:NEXT_PUBLIC_APP_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_SITE_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com"
npm run deploy:vps
```

- Compose: `docker-compose.prod.yml` + `.env.production` (có sẵn trên VPS)
- Image tag: `chapmee-web:deploy-YYYYMMDD-HHMMSS` + `chapmee-web:latest`
- Rollback: `npm run deploy:vps:rollback`
- Kiểm tra: `ssh deploy@14.225.211.205 "curl -sf http://127.0.0.1:3000/api/health"`

**Yêu cầu:** Docker Desktop chạy trên Windows, SSH key tới VPS (không cần password).

---

## Tóm tắt các cách

| Cách | Thời gian (thực tế) | Khi nào dùng |
|------|---------------------|--------------|
| **B. Build local + save/load** ⭐ | **~8–15 phút** | **Mặc định** — dev Windows, VPS Vietnix 4GB |
| **A. Build trên VPS** | Webpack **1–3+ giờ**, dễ OOM | **Tránh** — chỉ khi không có Docker local |
| **C. Pull GHCR** | Vài phút | CI đã build sẵn image |

**Compose file cho build trên VPS:** `docker-compose.production.yml`  
**Compose file cho pull image:** `docker-compose.prod.yml`  
**Env:** `.env.production` (có sẵn trên VPS, **không** upload từ git)

---

## A. Build trên VPS (Windows → SSH key)

### Điều kiện

- SSH key tới `deploy@14.225.211.205` (không cần password)
- `.env.production` đã có trên VPS
- VPS ~4GB RAM → heap build **`NODE_MAX_OLD_SPACE_SIZE=6144`** (8192 dễ OOM)

### Bước 1 — Đóng gói source (PowerShell, repo root)

```powershell
cd D:\PROGRAM-TRONG\CHAPMEE
Remove-Item .deploy-pack.tar.gz -ErrorAction SilentlyContinue
tar -czf .deploy-pack.tar.gz `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude=.env.production `
  --exclude=.env `
  --exclude=.env.local `
  --exclude=.deploy-pack.tar.gz `
  --exclude=.codex-tmp `
  --exclude=.cursor `
  --exclude="*.tar" `
  --exclude="*.tar.gz" `
  .
```

Kích thước ~8MB. **Không** gửi `.env.production`.

### Bước 2 — Upload

```powershell
scp .deploy-pack.tar.gz deploy@14.225.211.205:/tmp/chapmee-deploy.tar.gz
scp scripts/deploy/vps-build-remote-once.sh deploy@14.225.211.205:/tmp/vps-build-remote-once.sh
```

### Bước 3 — Build trên VPS (~15–40 phút)

Thực tế trên VPS 4GB (Vietnix): bước webpack **#27** thường **1–3 giờ** (swap nặng). Log file không cập nhật cho đến khi step xong — theo dõi process:

```powershell
ssh deploy@14.225.211.205 "ps aux | grep 'next build' | grep -v grep; tail -f /tmp/chapmee-build-*.log"
```

```powershell
ssh deploy@14.225.211.205 "chmod +x /tmp/vps-build-remote-once.sh; bash /tmp/vps-build-remote-once.sh"
```

Chạy nền (tránh timeout SSH):

```powershell
ssh deploy@14.225.211.205 "nohup bash /tmp/vps-build-remote-once.sh > /tmp/chapmee-deploy-wrapper.log 2>&1 &"
ssh deploy@14.225.211.205 "tail -f /tmp/chapmee-build-*.log"
```

### Bước 4 — Kiểm tra thành công

Phải thấy `HEALTH_OK` và JSON health:

```powershell
ssh deploy@14.225.211.205 "curl -sf http://127.0.0.1:3000/api/health"
ssh deploy@14.225.211.205 "cd /opt/chapmee/app && docker compose -f docker-compose.production.yml --env-file .env.production ps web"
```

Web container: `Up ... (healthy)`.

### Script tự động (repo)

- `scripts/deploy/vps-build-remote-once.sh` — chạy **trên VPS** sau khi upload tarball
- `scripts/deploy/vps-sync-deploy-remote-run.sh` — tương tự (dùng nội bộ)
- `scripts/deploy/run-vps-deploy-from-windows.sh` — cần `SSHPASS` (Git Bash/WSL)

---

## B. Build local, deploy image (không build trên VPS) ⭐

Xem **Deploy nhanh** ở đầu file. Chi tiết thêm:

```powershell
$env:VPS_USER = "deploy"
$env:VPS_HOST = "14.225.211.205"
$env:VPS_PATH = "/opt/chapmee/app"
powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1
```

- Script: `scripts/deploy/deploy-local-to-vps.ps1`
- Bỏ qua bước build nếu image local đã có: `-SkipBuild`
- Rollback: `-Rollback` (dùng file `/opt/chapmee/app/.deploy-rollback-image` trên VPS)
- Logs: `ssh deploy@14.225.211.205 'cd /opt/chapmee/app && docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web'`

**Lưu ý:** Script **không** upload `.env.production` — env giữ nguyên trên VPS.

---

## C. Pull từ GHCR (CI)

Xem `docs/DEPLOY_GITHUB_ACTIONS.md`. VPS **không** build — chỉ `docker compose pull` + `up -d`.

---

## Lệnh hữu ích trên VPS

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'

dcp ps
dcp logs -f web --tail 100
curl -sf http://127.0.0.1:3000/api/health
```

**Không chạy:** `docker compose down -v` (xóa volume postgres/minio).

---

## Sự cố thường gặp

### Script `.sh` bị lỗi `set: pipefail: invalid option name`

File upload từ Windows có CRLF. Trên VPS: `sed -i 's/\r$//' /tmp/vps-build-remote-once.sh`  
Script trong repo dùng LF; `vps-build-from-windows.ps1` tự chuẩn hóa trước khi scp.

### Build Next.js OOM / killed

- Đặt `NODE_MAX_OLD_SPACE_SIZE=6144` trong `.env.production`
- Retry: `dcp build web --no-cache`
- Dọn image cũ: `docker image prune -f`

### `Cannot find module .../scripts/db-apply-shims.mjs` trong container `web`

**Bình thường.** Image production (standalone) không copy `scripts/` hay `drizzle/`.

Shims chạy bằng one-shot container (đã có trong `vps-build-remote-once.sh`):

```bash
docker run --rm --network chapmee_chapmee_net \
  -v /opt/chapmee/app:/app -w /app \
  --env-file /opt/chapmee/app/.env.production \
  node:22-alpine sh -ec 'node scripts/db-apply-shims.mjs'
```

`DATABASE_URL` phải dùng host `postgres` (Docker network), không phải `127.0.0.1`.

### Hai file compose khác nhau

| File | Mục đích |
|------|----------|
| `docker-compose.production.yml` | **Build** `web` từ `Dockerfile` trên VPS |
| `docker-compose.prod.yml` | **Pull/load** image có sẵn (`CHAPMEE_WEB_IMAGE`) |

### Ổ đĩa VPS đầy (~83%+)

Trước build: `docker system df` và `docker image prune -f`. Build Next.js cần vài GB trống.

---

## Checklist deploy

### Local build (mặc định)

- [ ] Docker Desktop đang chạy
- [ ] `deploy-local-to-vps.ps1` → `Deploy OK` + `Health check: OK`
- [ ] `curl http://127.0.0.1:3000/api/health` trên VPS → `{"ok":true,...}`
- [ ] `https://chapmee.com` load bình thường

### Build trên VPS (chỉ khi cần)

- [ ] Upload tarball (không `.env.production`)
- [ ] `NODE_MAX_OLD_SPACE_SIZE=6144` trên VPS 4GB
- [ ] `dcp build web` thành công
- [ ] `dcp up -d`
- [ ] `curl http://127.0.0.1:3000/api/health` → `{"ok":true,...}`
- [ ] (Tuỳ chọn) DB shims one-shot container
- [ ] `https://chapmee.com` load bình thường

---

## Tham chiếu

- `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md` — stack services
- `docs/DEPLOY_GITHUB_ACTIONS.md` — CI/GHCR
- `DEPLOY_VIETNIX.md` — ghi chú Vietnix (có thể lỗi thời về tên compose file)
