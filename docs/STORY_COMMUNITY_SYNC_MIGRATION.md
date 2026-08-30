# Story Community Sync — Migration Guide

> **Deploy runbook (local + VPS, backup, rollback):** [STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md](./STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md)  
> **Final report & test checklist:** [STORY_COMMUNITY_SYNC_FINAL_REPORT.md](./STORY_COMMUNITY_SYNC_FINAL_REPORT.md)

Migration **`drizzle/0031_story_community_sync.sql`** thêm schema Story Community Sync:

| Bảng | Mục đích |
|------|----------|
| `story_groups` | Registry nhóm cộng đồng chính — 1 group / story |
| `interaction_events` | Log tương tác (idempotent qua `idempotency_key`) |
| `group_feed_items` | Projection feed nhóm — tham chiếu nguồn, không copy body |
| `community_sync_settings` | Key/value settings (JSON) |

**An toàn:** Migration chỉ `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, seed settings `ON CONFLICT DO NOTHING`. **Không DROP**, **không ALTER** bảng cũ.

Tham khảo audit: [`STORY_COMMUNITY_SYNC_AUDIT.md`](./STORY_COMMUNITY_SYNC_AUDIT.md)

Projection / gom nhóm / rebuild: [`STORY_COMMUNITY_SYNC_WORKER.md`](./STORY_COMMUNITY_SYNC_WORKER.md)

---

## 1. Prerequisites

- PostgreSQL đang chạy (local Docker hoặc VPS).
- Foundation + legacy đã apply (`stories`, `comments`, `profiles` tồn tại).
- Extension shims `0006`–`0030` đã apply (hoặc sẽ apply cùng lần chạy `db:shims`).

---

## 2. Local migration

### 2.1 Start stack (nếu chưa)

```powershell
cd D:\PROGRAM-TRONG\CHAPCHAP
npm run docker:local:up
npm run verify:local
```

### 2.2 Apply migration

```powershell
# Chỉ extension phase (0006+), gồm 0031
npm run db:shims

# Kiểm tra trạng thái
node scripts/db-apply-shims.mjs --status
```

Kỳ vọng thấy:

```
✓ 0031_story_community_sync.sql
```

### 2.3 Verify tables

```powershell
npx --yes tsx -e "
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chapmee:chapmee_local_password@127.0.0.1:5432/chapmee_local' });
await c.connect();
for (const t of ['story_groups','interaction_events','group_feed_items','community_sync_settings']) {
  const r = await c.query(`select count(*)::int as n from public.${t}`);
  console.log(t, r.rows[0].n);
}
await c.end();
"
```

### 2.4 Backfill story groups

Chỉ **tạo group thiếu** cho truyện `visibility=public` + `status in (approved, published)`. **Không xóa** group cũ.

```powershell
# Dry-run (mặc định — không ghi DB)
npm run community-sync:backfill-story-groups

# Dry-run explicit
npm run community-sync:backfill-story-groups -- --dry-run

# Apply thật
npm run community-sync:backfill-story-groups -- --apply

# Giới hạn batch (optional)
npm run community-sync:backfill-story-groups -- --apply --limit=500
```

### 2.5 Default settings

Migration seed các key sau (nếu chưa có):

| Key | Default |
|-----|---------|
| `auto_create_story_group` | `true` |
| `sync_chapter_comments` | `true` |
| `sync_reel_comments` | `true` |
| `sync_audio_comments` | `true` |
| `sync_adaptation_comments` | `true` |
| `sync_author_replies` | `true` |
| `collapse_window_minutes` | `30` |
| `max_activity_items_per_source_per_hour` | `5` |
| `spoiler_protection_enabled` | `true` |
| `notify_group_members_default` | `"important_only"` |

Đọc trong app: `getCommunitySyncSettings()` — `lib/community-sync/sync-settings.ts`

### 2.6 Quality gates

```powershell
npm run typecheck
npm run build
```

(`npm run lint` có thể fail do lỗi cũ không liên quan module này.)

---

## 3. VPS migration

> **Cảnh báo:** Luôn **backup PostgreSQL** trước khi chạy migration trên production.

### 3.1 Checklist VPS

- [ ] **Backup DB** (bắt buộc)
- [ ] Pull code mới
- [ ] Build/restart web container
- [ ] Chạy migration (`db:shims`)
- [ ] Verify `--status` có `0031_story_community_sync.sql`
- [ ] Backfill **dry-run**
- [ ] Backfill **apply**
- [ ] Restart / health check
- [ ] Kiểm tra logs

### 3.2 Backup (bắt buộc)

Trên VPS (`/opt/chapmee/app`):

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'

# Cách 1 — script repo
bash scripts/deploy/backup-postgres.sh

# Cách 2 — pg_dump thủ công
dcp exec postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > /opt/chapmee/backups/pre-story-community-sync_$(date +%Y%m%d_%H%M).dump
```

**Không** chạy `docker compose down -v`, `DROP TABLE`, hay reset database.

### 3.3 Deploy code

```bash
cd /opt/chapmee/app
git pull
dcp up -d --build web
```

### 3.4 Apply migration

```bash
dcp exec web node scripts/db-apply-shims.mjs --status
dcp exec web node scripts/db-apply-shims.mjs
dcp exec web node scripts/db-apply-shims.mjs --status
```

Chỉ apply file **pending** (0031 nếu chưa có). DB đã có legacy — **không** chạy lại full `db:setup` trừ fresh install.

### 3.5 Backfill

```bash
# Dry-run
dcp exec web npm run community-sync:backfill-story-groups

# Apply
dcp exec web npm run community-sync:backfill-story-groups -- --apply
```

### 3.6 Restart & verify

```bash
dcp restart web
dcp logs -f web --tail=100
curl -sI https://chapmee.com | head -3
```

Kiểm tra DB (trong container postgres hoặc web):

```bash
dcp exec web node -e "
const pg=require('pg');
(async()=>{
  const c=new pg.Client({connectionString:process.env.DATABASE_URL});
  await c.connect();
  const r=await c.query('select count(*)::int as n from public.story_groups');
  console.log('story_groups', r.rows[0].n);
  await c.end();
})();
"
```

### 3.7 Rollback

1. Revert git commit + rebuild web (`dcp up -d --build web`).
2. Bảng mới là **additive** — app cũ vẫn chạy được nếu chưa dùng module sync.
3. Chỉ restore dump nếu migration/backfill gây lỗi nghiêm trọng:

```bash
bash scripts/deploy/restore-postgres.sh
# hoặc pg_restore theo BACKUP_RESTORE_GUIDE.md
```

---

## 4. Module map

| Path | Vai trò |
|------|---------|
| `drizzle/0031_story_community_sync.sql` | SQL migration |
| `lib/db/schema/story-community-sync.ts` | Drizzle schema |
| `lib/community-sync/story-groups.ts` | `getOrCreateStoryGroup`, `backfillStoryGroupsForPublishedStories` |
| `lib/community-sync/sync-settings.ts` | `getCommunitySyncSettings` |
| `types/story-community-sync.ts` | TypeScript types |
| `scripts/backfill-story-groups.ts` | CLI backfill |

---

## 5. Troubleshooting

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| `relation "stories" does not exist` | Chạy shims trước legacy | `db:legacy` rồi `db:shims` |
| `relation "story_groups" does not exist` | 0031 chưa apply | `npm run db:shims` |
| Backfill 0 candidates | Tất cả published stories đã có group | Bình thường |
| `duplicate key story_groups_story_id_unique` | Race insert | Idempotent — group đã tồn tại |
| Permission denied (PostgREST) | Thiếu grant | Migration 0031 đã `GRANT` cho `service_role` |

---

## 6. Next steps (ngoài scope migration)

- Hook `createCommentRecord` → `interaction_events` + `group_feed_items` — **đã triển khai**
- API cursor feed `/api/community/story/[storyId]/feed` — **đã triển khai**
- Admin UI cho `community_sync_settings` — **đã triển khai**

Xem [STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md](./STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md) để vận hành.
