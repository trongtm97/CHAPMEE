# Deploy ChapMee lên VPS Vietnix

> **⚠️ BẮT BUỘC:** VPS Vietnix (~4GB RAM) **không build được** Next.js Docker image.
> **Luôn build trên máy local** (Docker Desktop) rồi đẩy image lên VPS.
> **Không** chạy `docker compose build` / `docker build` trên VPS.

**Runbook (đã verify):** [`docs/VPS_BUILD_RUNBOOK.md`](docs/VPS_BUILD_RUNBOOK.md)

**Deploy nhanh (Windows, ~8–15 phút):**

```powershell
$env:VPS_USER = "deploy"
$env:VPS_HOST = "14.225.211.205"
$env:VPS_PATH = "/opt/chapmee/app"
npm run deploy:vps
```

Chi tiết: [`docs/DEPLOY_IMAGE_SAVE_LOAD.md`](docs/DEPLOY_IMAGE_SAVE_LOAD.md)

Tài liệu dưới đây mô tả **cài đặt ban đầu trên server**. Deploy code mới → dùng runbook local build ở trên, không build trên VPS.

## 1. Chuẩn bị Vietnix

1. Mua VPS Ubuntu 24.04 (khuyến nghị ≥ 2 vCPU, 4 GB RAM cho MVP).
2. Mua **S3 Object Storage** Vietnix, tạo bucket (ví dụ `chapmee-media-public`).
3. Trỏ DNS:
   - `chapmee.com` → A record IP VPS
   - `www.chapmee.com` → CNAME `chapmee.com` hoặc A record

## 2. Cài đặt trên VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
```

Cài Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Caddyfile mẫu (`/etc/caddy/Caddyfile`)

```caddy
chapmee.com {
  reverse_proxy 127.0.0.1:3000
}

www.chapmee.com {
  redir https://chapmee.com{uri} permanent
}
```

```bash
sudo systemctl reload caddy
```

## 3. Clone và cấu hình app

```bash
sudo mkdir -p /opt/chapmee
sudo chown $USER:$USER /opt/chapmee
git clone <YOUR_REPO_URL> /opt/chapmee/app
cd /opt/chapmee/app
cp .env.example .env.production
```

Chỉnh `.env.production` (không commit):

- `NEXT_PUBLIC_APP_URL`, `APP_URL`, `BETTER_AUTH_URL` = `https://chapmee.com`
- `DATABASE_URL` = `postgresql://chapmee:STRONG_PASSWORD@postgres:5432/chapmee`
- `POSTGRES_PASSWORD` (cho compose)
- `BETTER_AUTH_SECRET` = `openssl rand -base64 32`
- `POSTGREST_JWT_SECRET` = secret riêng (≥ 32 ký tự), **cùng giá trị** với `PGRST_JWT_SECRET` trong `docker-compose.yml`
- `POSTGREST_URL` = `http://postgrest:3000` (trong mạng Docker) hoặc URL nội bộ app → PostgREST
- `S3_*` theo panel Vietnix S3
- `REDIS_URL=redis://redis:6379`

## 4. Deploy code mới (mỗi lần release)

**Trên máy dev (Windows):** build Docker image local → upload → VPS chỉ `docker load` + `up -d`.

```powershell
# Kiểm tra nhanh trước khi đóng gói image (tuỳ chọn)
npm run typecheck
npm run build

# Deploy lên VPS (script tự build Docker local)
$env:VPS_USER = "deploy"
$env:VPS_HOST = "14.225.211.205"
$env:VPS_PATH = "/opt/chapmee/app"
$env:NEXT_PUBLIC_APP_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_SITE_URL = "https://chapmee.com"
$env:NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL = "https://media.chapmee.com"
npm run deploy:vps
```

Rollback: `npm run deploy:vps:rollback`

**Trên VPS sau deploy** (chỉ kiểm tra / xem log — không build):

```bash
cd /opt/chapmee/app
docker compose -f docker-compose.prod.yml --env-file .env.production ps web
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f web --tail 100
curl -sf http://127.0.0.1:3000/api/health
```

## 5. ~~Build Docker trên VPS~~ (deprecated)

VPS 4GB **không đủ RAM** — webpack có thể chạy 1–3+ giờ hoặc OOM. **Không dùng** cho deploy thường ngày.

Nếu bắt buộc (không có Docker local): xem mục A trong [`docs/VPS_BUILD_RUNBOOK.md`](docs/VPS_BUILD_RUNBOOK.md).

## 6. Migration database

Trên VPS (sau Postgres healthy):

```bash
docker compose exec app node scripts/db-migrate-foundation.mjs
docker compose exec app node scripts/db-apply-legacy-migrations.mjs
```

Hoặc chạy từ host nếu `DATABASE_URL` trỏ `127.0.0.1:5432`.

## 7. MinIO / S3

Production dùng Vietnix S3, không dùng MinIO. Đảm bảo bucket public (hoặc CDN) khớp `S3_PUBLIC_BASE_URL`.

Local: tạo bucket `chapmee-local-media` trong MinIO Console `http://localhost:9001`.

## 8. Backup PostgreSQL

```bash
sudo mkdir -p /opt/backups/chapmee-db
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

Cron ví dụ (02:00 hàng ngày):

```cron
0 2 * * * cd /opt/chapmee/app && ./scripts/backup-db.sh >> /var/log/chapmee-backup.log 2>&1
```

TODO: cấu hình `rclone` copy file `.sql.gz` lên bucket Vietnix.

## 9. Checklist sau deploy

- [ ] `https://chapmee.com` mở trang chủ
- [ ] Đăng ký / đăng nhập hoạt động
- [ ] Upload ảnh qua flow presign → MinIO/S3
- [ ] `docker compose ps` tất cả healthy
- [ ] Backup DB chạy được
- [ ] Không expose Postgres/Redis ra internet (chỉ `127.0.0.1` hoặc internal network)

## 10. Việc bạn cần tự làm ngoài repo

- Mua VPS + S3, thanh toán / firewall panel Vietnix
- Tạo DNS, chờ propagate
- Nhập secret production vào `.env.production`
- SSL do Caddy tự xin (Let's Encrypt) khi DNS đã trỏ đúng
