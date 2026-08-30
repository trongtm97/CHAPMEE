# Deploy ChapMee — docker save/load (local build → VPS 4GB)

Build image trên máy local (nhiều RAM). VPS **chỉ load image** và chạy `docker-compose.prod.yml` — **không** `docker build`, **không** `docker compose up --build`.

---

## Biến môi trường (script)

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `VPS_USER` | *(bắt buộc)* | SSH user |
| `VPS_HOST` | *(bắt buộc)* | IP hoặc hostname VPS |
| `VPS_PATH` | `/opt/chapmee/app` | Thư mục app trên VPS |
| `IMAGE_NAME` | `chapmee-web` | Tên Docker image |

Tùy chọn build-args (local):

```bash
export NEXT_PUBLIC_APP_URL=https://chapmee.com
export NEXT_PUBLIC_SITE_URL=https://chapmee.com
export NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com
export NODE_MAX_OLD_SPACE_SIZE=8192
```

**Không upload `.env.production` từ local** — file env phải tồn tại sẵn trên VPS.

---

## Lệnh manual (từng bước)

### A. Trên máy local

```bash
cd /path/to/CHAPMEE

# 1. Build (dùng RAM local)
docker build -t chapmee-web:latest \
  --build-arg NODE_MAX_OLD_SPACE_SIZE=8192 \
  --build-arg NEXT_PUBLIC_APP_URL=https://chapmee.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://chapmee.com \
  --build-arg NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com \
  .

# 2. Tag theo timestamp (rollback)
docker tag chapmee-web:latest chapmee-web:deploy-$(date +%Y%m%d-%H%M%S)

# 3. Save + nén
docker save chapmee-web:latest | gzip > chapmee-web.tar.gz

# 4. Upload lên VPS
scp chapmee-web.tar.gz deploy@YOUR_VPS_IP:/opt/chapmee/app/images/
```

### B. Trên VPS

```bash
cd /opt/chapmee/app

# 5. Lưu image cũ để rollback (nếu đã có)
docker image inspect chapmee-web:latest >/dev/null 2>&1 && \
  docker tag chapmee-web:latest chapmee-web:rollback-$(date +%Y%m%d-%H%M%S)

# 6. Load image mới
gunzip -c images/chapmee-web.tar.gz | docker load

# 7. Chạy stack — KHÔNG --build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 8. Kiểm tra
docker ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web
curl -s http://127.0.0.1:3000/api/health
```

### C. Rollback thủ công (VPS)

```bash
cd /opt/chapmee/app
# Thay bằng tag rollback đã lưu:
docker tag chapmee-web:rollback-YYYYMMDD-HHMMSS chapmee-web:latest
docker compose -f docker-compose.prod.yml --env-file .env.production up -d web
```

---

## Script tự động

### Windows (PowerShell)

```powershell
$env:VPS_USER = "deploy"
$env:VPS_HOST = "YOUR_VPS_IP"
$env:VPS_PATH = "/opt/chapmee/app"
$env:IMAGE_NAME = "chapmee-web"
$env:NEXT_PUBLIC_APP_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_SITE_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com"

powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1
```

Rollback:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy\deploy-local-to-vps.ps1 -Rollback
```

### Linux / macOS / Git Bash

```bash
export VPS_USER=deploy
export VPS_HOST=YOUR_VPS_IP
export VPS_PATH=/opt/chapmee/app
export IMAGE_NAME=chapmee-web

chmod +x scripts/deploy/deploy-local-to-vps.sh
./scripts/deploy/deploy-local-to-vps.sh
```

Rollback:

```bash
./scripts/deploy/deploy-local-to-vps.sh --rollback
```

Script thực hiện:

1. `docker build` local (tag `deploy-TIMESTAMP` + `latest`)
2. `docker save | gzip`
3. `scp` lên `$VPS_PATH/images/`
4. VPS: lưu rollback tag → `docker load`
5. VPS: `docker compose -f docker-compose.prod.yml up -d` (**không** `--build`)
6. Health check `GET /api/health`
7. Ghi rollback tag vào `$VPS_PATH/.deploy-rollback-image`

---

## Checklist deploy

### Trước deploy (local)

- [ ] Code đã commit / tag release rõ ràng
- [ ] `pnpm-lock.yaml` đồng bộ với `package.json`
- [ ] `npm run build` hoặc `docker build` pass trên local
- [ ] Đã set `NEXT_PUBLIC_*` build-args đúng production
- [ ] SSH key tới VPS hoạt động (`ssh deploy@VPS`)

### Trên VPS (một lần / khi đổi infra)

- [ ] `/opt/chapmee/app` có `docker-compose.prod.yml`, `Caddyfile.production`
- [ ] `.env.production` tồn tại trên VPS (tạo thủ công, **không** scp từ máy dev)
- [ ] `CHAPMEE_WEB_IMAGE=chapmee-web:latest` trong `.env.production` (script tự cập nhật)
- [ ] Thư mục `images/` tồn tại hoặc script tạo tự động

### Deploy

- [ ] Build image **trên local** (không trên VPS)
- [ ] `docker save` + upload `scp`
- [ ] VPS: `docker load` (không `docker build`)
- [ ] `docker compose -f docker-compose.prod.yml --env-file .env.production up -d` (**không** `--build`)
- [ ] `docker ps` — `chapmee-web` healthy
- [ ] `curl http://127.0.0.1:3000/api/health` → OK
- [ ] `https://chapmee.com` load được

### Sau deploy / nếu lỗi

- [ ] Rollback: `deploy-local-to-vps.ps1 -Rollback` hoặc `--rollback`
- [ ] Xem log: `docker compose -f docker-compose.prod.yml logs -f web`
- [ ] **Không** chạy `docker compose down -v` (mất DB volume)

---

## Lệnh cấm trên VPS 4GB

```bash
docker build .                              # ❌
docker compose build                        # ❌
docker compose up -d --build                # ❌
docker compose -f docker-compose.production.yml build web   # ❌
```

---

## Files liên quan

| File | Vai trò |
|------|---------|
| `Dockerfile` | Multi-stage build (local/CI only) |
| `docker-compose.prod.yml` | Stack production pull-only |
| `scripts/deploy/deploy-local-to-vps.ps1` | Deploy Windows |
| `scripts/deploy/deploy-local-to-vps.sh` | Deploy Bash/WSL |
