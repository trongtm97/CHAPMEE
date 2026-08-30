# Story Community Sync — Local & VPS Deploy Runbook

Operator guide để triển khai, kiểm tra và rollback **Story Community Sync** trên môi trường local và production VPS.

**Liên quan:**

| Doc | Nội dung |
|-----|----------|
| [STORY_COMMUNITY_SYNC_MIGRATION.md](./STORY_COMMUNITY_SYNC_MIGRATION.md) | Schema & migration chi tiết |
| [STORY_COMMUNITY_SYNC_ADMIN.md](./STORY_COMMUNITY_SYNC_ADMIN.md) | Admin settings |
| [STORY_COMMUNITY_SYNC_WORKER.md](./STORY_COMMUNITY_SYNC_WORKER.md) | Projection, rebuild, multi-source |
| [STORY_COMMUNITY_SYNC_FINAL_REPORT.md](./STORY_COMMUNITY_SYNC_FINAL_REPORT.md) | Báo cáo tổng kết & test |
| [DEPLOY_VIETNIX_PRODUCTION.md](./DEPLOY_VIETNIX_PRODUCTION.md) | Deploy VPS tổng thể (Docker Compose) |
| [BACKUP_RESTORE_GUIDE.md](./BACKUP_RESTORE_GUIDE.md) | Restore PostgreSQL |

---

## 1. Tổng quan tính năng

**Story Community Sync** đồng bộ tương tác đọc truyện vào **nhóm cộng đồng theo truyện** (`story_groups`):

```
Comment / Review / Reels / Audio / Phim
  → interaction_events (log idempotent)
  → group_feed_items (projection feed)
  → UI /community/story/[slug]
```

**Đặc điểm an toàn:**

- Migration **additive only** — không DROP bảng legacy.
- Sync **không block** request comment (fire-and-forget + catch log).
- **Idempotency** qua `interaction_events.idempotency_key` và unique constraint feed.
- **Aggregation** tránh spam feed khi nhiều comment cùng nguồn.
- Admin bật/tắt từng nguồn sync qua DB settings.

**Routes chính:**

| Route | Mô tả |
|-------|--------|
| `/community/story/[slug]` | Trang nhóm truyện + feed hoạt động |
| `/api/community/story/[storyId]/feed` | Feed API (cursor pagination) |
| `/admin/community/story-sync` | Cấu hình sync + tools |

---

## 2. Schema & migrations

| Migration | Bảng / thay đổi |
|-----------|-----------------|
| `drizzle/0031_story_community_sync.sql` | `story_groups`, `interaction_events`, `group_feed_items`, `community_sync_settings` |
| `drizzle/0032_community_sync_settings_extended.sql` | Seed thêm keys admin (reviews, spam, preview paid, …) |

**Indexes quan trọng (đã có trong 0031):**

| Bảng | Index | Phục vụ |
|------|-------|---------|
| `story_groups` | `(story_id)`, `(group_slug)` | Resolve group theo story/slug |
| `interaction_events` | `(story_id, created_at desc)`, `(group_id, created_at desc)` | Log / rebuild batch |
| `interaction_events` | `UNIQUE (idempotency_key)` | Chống duplicate event |
| `group_feed_items` | `(group_id, created_at desc)`, `(story_id, created_at desc)` | **Feed page load** |
| `group_feed_items` | `(visibility, moderation_status)` | Lọc public feed |
| `group_feed_items` | `UNIQUE (group_id, source_entity_type, source_entity_id, item_type)` | Chống duplicate card |

Mở trang group **không** scan toàn bộ `interaction_events` — chỉ query `group_feed_items` có index.

---

## 3. Biến môi trường

Story Community Sync **không thêm env riêng**. Dùng biến DB/app sẵn có:

| Variable | Bắt buộc | Ghi chú |
|----------|----------|---------|
| `DATABASE_URL` | Có | PostgreSQL connection (local/VPS) |
| `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | VPS Compose | Cho backup script |
| `BETTER_AUTH_*`, session | Có | Auth comment/admin |

Local: copy `.env.local` từ template repo (`npm run verify:local` kiểm tra stack).

VPS: `.env.production` — **không commit**, `chmod 600`. Xem [DEPLOY_VIETNIX_PRODUCTION.md](./DEPLOY_VIETNIX_PRODUCTION.md).

---

## 4. Local — chuẩn bị

### 4.1 Start stack

**PowerShell (Windows):**

```powershell
cd D:\PROGRAM-TRONG\CHAPCHAP
npm run docker:local:up
npm run verify:local
```

**Bash (Linux/macOS):**

```bash
cd /path/to/CHAPCHAP
npm run docker:local:up
npm run verify:local
```

### 4.2 Install dependencies

```bash
npm ci
```

---

## 5. Local — migration

```powershell
# Extension migrations 0006+ (gồm 0031, 0032)
npm run db:shims

# Kiểm tra trạng thái
node scripts/db-apply-shims.mjs --status
```

Kỳ vọng:

```
✓ 0031_story_community_sync.sql
✓ 0032_community_sync_settings_extended.sql
```

Fresh DB (hiếm khi cần):

```powershell
npm run db:setup
```

**Không** chạy `db:reset-local` trên DB có dữ liệu cần giữ.

---

## 6. Local — backfill & rebuild

### 6.1 Backfill story groups (tạo group thiếu)

```powershell
# Dry-run (mặc định — không ghi DB)
npm run story-sync:backfill:dry-run

# Apply
npm run story-sync:backfill

# Giới hạn batch
npm run community-sync:backfill-story-groups -- --apply --limit=500
```

### 6.2 Rebuild feed projection (từ events → feed items)

Chỉ cần khi projection lệch hoặc sau thay đổi logic aggregation.

```powershell
# Dry-run
npm run story-sync:rebuild-feed:dry-run

# Apply
npm run story-sync:rebuild-feed

# Batch nhỏ
npm run community-sync:rebuild-feed -- --dry-run --batch-size=200 --offset=0 --max-batches=5
```

### 6.3 Validate

```powershell
npm run community-sync:validate
npm run community-sync:validate -- --story-id=<uuid>
```

---

## 7. Local — build & dev

```powershell
npm run typecheck
npm run build
npm run dev
```

Mở:

- `http://localhost:3000/community/story/{slug-truyện}`
- `http://localhost:3000/admin/community/story-sync` (tài khoản admin)

---

## 8. Local — kiểm tra dữ liệu

### 8.1 Đếm bảng

```powershell
npm run community-sync:validate
```

Hoặc SQL trực tiếp (pg client / Drizzle):

```sql
select
  (select count(*) from public.story_groups) as story_groups,
  (select count(*) from public.interaction_events) as events,
  (select count(*) from public.group_feed_items) as feed_items,
  (select count(*) from public.community_sync_settings) as settings;
```

### 8.2 Test comment → feed

1. Đăng nhập user test.
2. Bình luận một chương truyện có `story_groups`.
3. Refresh `/community/story/{slug}` → tab **Hoạt động** có card mới.
4. Bấm **Xem thêm** → pagination cursor hoạt động.

### 8.3 Test admin setting

1. Vào `/admin/community/story-sync`.
2. Tắt `sync_chapter_comments` → lưu.
3. Comment mới **không** xuất hiện feed (event có thể vẫn log tùy pipeline — feed không project).
4. Bật lại.

### 8.4 Test duplicate / idempotency

`community-sync:validate` chạy test idempotency event. Không nên thấy 2 event cùng `idempotency_key`.

---

## 9. VPS — kiến trúc deploy (repo hiện tại)

ChapMee production dùng **Docker Compose** (không PM2/systemd trực tiếp cho app):

| Thành phần | Ghi chú |
|------------|---------|
| `web` | Next.js container |
| `postgres` | PostgreSQL |
| `caddy` | Reverse proxy TLS |
| `minio`, `redis`, … | Stack đầy đủ |

App root trên VPS: **`/opt/chapmee/app`**

**Alias khuyến nghị** (mọi lệnh compose):

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'
```

### ⚠️ Docker Compose — lệnh cấm

```bash
# KHÔNG BAO GIỜ — xóa volumes PostgreSQL
docker compose down -v
dcp down -v
```

### Restart an toàn

```bash
dcp up -d --build web      # deploy code mới
dcp restart web            # restart nhẹ
dcp logs -f web --tail=100 # xem logs
```

---

## 10. VPS — checklist trước migration

In và tick từng bước:

- [ ] Thông báo maintenance window (nếu cần)
- [ ] **Backup PostgreSQL** (bắt buộc)
- [ ] Ghi lại commit hash hiện tại: `git rev-parse HEAD`
- [ ] Dry-run backfill trên VPS
- [ ] Dry-run rebuild feed (nếu dùng)
- [ ] Có kế hoạch rollback code
- [ ] Biết đường dẫn file backup vừa tạo

---

## 11. VPS — backup PostgreSQL

Từ `/opt/chapmee/app`:

```bash
# Script repo (khuyến nghị)
bash scripts/backup-postgres.sh

# Hoặc wrapper tương đương
bash scripts/deploy/backup-postgres.sh

# Tùy chỉnh
BACKUP_DIR=/opt/backups/chapmee/postgres RETENTION_DAYS=30 bash scripts/backup-postgres.sh
```

Output mẫu: `/opt/backups/chapmee/postgres/chapmee-postgres-YYYYMMDD-HHMMSS.sql.gz`

**Script không in password.** Dùng `compose exec postgres pg_dump` qua Docker network.

Verify file không rỗng:

```bash
ls -lh /opt/backups/chapmee/postgres/chapmee-postgres-*.sql.gz | tail -1
gzip -t /opt/backups/chapmee/postgres/chapmee-postgres-*.sql.gz
```

Restore khi cần: [BACKUP_RESTORE_GUIDE.md](./BACKUP_RESTORE_GUIDE.md) hoặc `scripts/deploy/restore-postgres.sh`.

---

## 12. VPS — pull, build, migration

```bash
cd /opt/chapmee/app
git fetch origin
git pull

# Build & restart web (không down -v)
dcp up -d --build web

# Migration status
dcp exec web node scripts/db-apply-shims.mjs --status

# Apply pending only
dcp exec web node scripts/db-apply-shims.mjs

# Verify
dcp exec web node scripts/db-apply-shims.mjs --status
```

Chỉ apply file **pending** (0031/0032 nếu chưa có). **Không** chạy lại full `db:setup` trên DB production có legacy data.

---

## 13. VPS — backfill

```bash
# Dry-run
dcp exec web npm run story-sync:backfill:dry-run

# Apply (sau khi dry-run ổn)
dcp exec web npm run story-sync:backfill
```

Rebuild projection (optional, sau dry-run):

```bash
dcp exec web npm run story-sync:rebuild-feed:dry-run
dcp exec web npm run story-sync:rebuild-feed
```

Hoặc dùng admin **Tools** tại `/admin/community/story-sync` (cùng logic, có audit log).

Validate:

```bash
dcp exec web npm run community-sync:validate
```

---

## 14. VPS — restart & health check

```bash
dcp restart web
dcp ps
dcp logs -f web --tail=100
curl -sI https://chapmee.com | head -3
```

Kiểm tra functional:

1. Một truyện thật → `/community/story/{slug}`
2. Feed có hoạt động, filter chip hoạt động
3. Admin `/admin/community/story-sync` load settings
4. Comment thử trên chương → sync (nếu setting bật)

---

## 15. VPS — xem logs

```bash
# App (Next.js)
dcp logs -f web --tail=200

# Lọc community-sync
dcp logs web --tail=500 2>&1 | grep -i community-sync

# PostgreSQL (hiếm khi cần)
dcp logs postgres --tail=100
```

Log skip an toàn (dev/VPS):

- `[community-sync/reels] skip: missing_story_id`
- `[community-sync] comment sync failed` (caught, không crash request)

---

## 16. Rollback

### 16.1 Rollback code (ưu tiên)

Migration additive — app cũ thường vẫn chạy nếu chưa dùng UI sync.

```bash
cd /opt/chapmee/app
git log -3 --oneline
git checkout <previous-commit>
dcp up -d --build web
dcp restart web
```

Bảng mới (`story_groups`, …) **có thể giữ lại** — không gây lỗi app cũ.

### 16.2 Rollback DB (trường hợp xấu)

Chỉ khi migration/backfill gây lỗi nghiêm trọng **và** đã có backup.

```bash
# Dừng ghi (optional — maintenance)
dcp stop web

# Restore từ backup (xem BACKUP_RESTORE_GUIDE.md)
bash scripts/deploy/restore-postgres.sh

# Hoặc thủ công pg_restore / psql từ file .sql.gz
```

**Không** `DROP TABLE` thủ công trừ khi có kế hoạch DBA rõ ràng.

### 16.3 Rollback settings (nhẹ)

Sửa trực tiếp trong admin hoặc SQL:

```sql
update public.community_sync_settings
set value_json = 'false'::jsonb, updated_at = now()
where key = 'sync_chapter_comments';
```

---

## 17. NPM scripts tham chiếu

| Script | Mô tả |
|--------|--------|
| `story-sync:backfill:dry-run` | Backfill groups — không ghi DB |
| `story-sync:backfill` | Backfill groups — apply |
| `story-sync:rebuild-feed:dry-run` | Rebuild projection — dry-run |
| `story-sync:rebuild-feed` | Rebuild projection — apply |
| `community-sync:validate` | Kiểm tra bảng + idempotency + feed |
| `community-sync:backfill-story-groups` | Alias gốc backfill |
| `community-sync:rebuild-feed` | Alias gốc rebuild |

Flags rebuild: `--batch-size=N`, `--offset=N`, `--max-batches=N`, `--dry-run`, `--apply`.

Flags backfill: `--dry-run`, `--apply`, `--limit=N`.

---

## 18. Quyền & bảo mật (checklist)

| Kiểm tra | Kỳ vọng |
|----------|---------|
| `/admin/community/story-sync` | Chỉ admin/moderator (`requireAdminOrModerator`) |
| Lưu settings / chạy tools | `admin.settings.update` (`assertStaffAnyPermission`) |
| User thường | Không gọi được server actions admin |
| Feed API | Chỉ `visibility=visible`, `moderation_status=approved` (default) |
| Admin layout | `robots: noindex` (`app/admin/layout.tsx`) |

---

## 19. Performance (đã kiểm tra)

| Luồng | Đánh giá |
|-------|----------|
| Mở group feed | Query `group_feed_items` theo `group_id` + index `(group_id, created_at desc)` — **OK** |
| Enrich actors | 1 batch query comments + 1 batch reviews — **không N+1** |
| Sync comment | Count events trong bucket trên **write path** — không ảnh hưởng page load |
| Pagination | Cursor `(created_at, id)` — **OK** |

**Ghi chú cải thiện sau (không blocker):** `countEventsInAggregationBucket` dùng `select id` rồi `.length` — có thể chuyển `COUNT(*)` khi traffic sync cao.

---

## 20. Mobile / desktop

- Group page dùng horizontal scroll tabs/filters, card stack — responsive.
- Kiểm tra manual: viewport mobile (~390px) và desktop (≥1280px).
- Không đổi bottom nav (ngoài scope).

---

## 21. Troubleshooting

| Triệu chứng | Nguyên nhân | Xử lý |
|-------------|-------------|--------|
| `relation "story_groups" does not exist` | 0031 chưa apply | `npm run db:shims` / VPS `db-apply-shims.mjs` |
| Feed trống sau comment | Setting tắt / chưa có group | Admin settings; `story-sync:backfill` |
| Duplicate cards | Rebuild lỗi | `story-sync:rebuild-feed:dry-run` rồi apply |
| Reels không sync | Thiếu `reelItemId` hoặc `sync_reel_comments=false` | Check POST body + admin |
| `compose` lỗi thiếu env | Thiếu `--env-file .env.production` | Dùng alias `dcp` |
| Backup rỗng | Postgres container down | `dcp ps`, start postgres |

---

## 22. Quick reference — lệnh một dòng

**Local full check:**

```powershell
npm run db:shims; npm run story-sync:backfill:dry-run; npm run community-sync:validate; npm run build
```

**VPS deploy sync module:**

```bash
cd /opt/chapmee/app && bash scripts/backup-postgres.sh && git pull && dcp up -d --build web && dcp exec web node scripts/db-apply-shims.mjs && dcp exec web npm run story-sync:backfill:dry-run && dcp exec web npm run story-sync:backfill && dcp restart web
```

Luôn xem dry-run output trước khi `--apply`.
