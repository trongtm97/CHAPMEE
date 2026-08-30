# Story Community Sync — Final Report

Báo cáo tổng kết triển khai **Story Community Sync** trên ChapMee — phạm vi đến thời điểm hoàn thiện docs/hardening (không thêm feature lớn mới).

**Runbook vận hành:** [STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md](./STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md)

---

## 1. Executive summary

Story Community Sync đã có đủ:

- Schema PostgreSQL additive (0031 + 0032)
- Pipeline sync comment/review/reels (+ adapter audio/phim)
- Projection + aggregation chống spam feed
- UI nhóm truyện + filter nguồn hoạt động
- Admin settings + tools + audit
- Scripts CLI dry-run/apply + validate
- Tài liệu local/VPS + backup/rollback

**Build:** `npm run typecheck` và `npm run build` pass tại thời điểm báo cáo.

---

## 2. Đã hoàn thành

### 2.1 Database & migration

| Item | Status |
|------|--------|
| `story_groups` — 1 group / story | ✅ |
| `interaction_events` — idempotent log | ✅ |
| `group_feed_items` — feed projection | ✅ |
| `community_sync_settings` — admin KV | ✅ |
| Migration 0031 + 0032 | ✅ |
| Indexes cho feed query | ✅ |
| GRANT `service_role` | ✅ |

### 2.2 Backend sync

| Item | Status |
|------|--------|
| Comment chương / story page sync | ✅ |
| Reply + author reply + hot thread | ✅ |
| Reels adapter (`reelItemId`, target URL, spoiler) | ✅ |
| Audio adapter (interface, wire-ready) | ✅ |
| Adaptation/trailer adapter (interface) | ✅ |
| Review sync (meaningful text only) | ✅ |
| Admin toggles per source | ✅ |
| Aggregation / rate limit projection | ✅ |
| Rebuild projection script (dry-run default) | ✅ |
| Backfill story groups script | ✅ |
| Validate script (idempotency + feed) | ✅ |

### 2.3 API & UI

| Item | Status |
|------|--------|
| `GET /api/community/story/[storyId]/feed` — cursor pagination | ✅ |
| `/community/story/[slug]` — activity feed, tabs | ✅ |
| Activity filters (All / Chapters / Reels / Audio / Films / Review) | ✅ |
| Spoiler excerpt MVP (paid chapter) | ✅ |
| Entry points story/chapter/community | ✅ |
| `/admin/community/story-sync` | ✅ |

### 2.4 Docs & scripts

| Item | Status |
|------|--------|
| STORY_COMMUNITY_SYNC_MIGRATION.md | ✅ |
| STORY_COMMUNITY_SYNC_ADMIN.md | ✅ |
| STORY_COMMUNITY_SYNC_WORKER.md | ✅ |
| STORY_COMMUNITY_SYNC_AUDIT.md | ✅ |
| **STORY_COMMUNITY_SYNC_LOCAL_VPS_DEPLOY.md** | ✅ |
| **STORY_COMMUNITY_SYNC_FINAL_REPORT.md** | ✅ |
| `scripts/backup-postgres.sh` (wrapper) | ✅ |
| `scripts/deploy/backup-postgres.sh` (production) | ✅ (có sẵn) |
| NPM aliases `story-sync:*` | ✅ |

---

## 3. Chưa làm / ngoài scope

| Item | Ghi chú |
|------|---------|
| Full audio comment module UI | Chỉ adapter; wire khi module có |
| Full film comment module UI | Chỉ adapter |
| Real-time push notification group members | Setting `notify_group_members_default` reserved |
| Author pin/hide group items UI | Settings có; UI tác giả chưa |
| Redis/queue worker | Sync inline + rebuild script |
| Automated E2E Playwright cho group feed | Manual QA checklist thay thế |
| Composite index `(group_id, visibility, moderation_status, created_at)` | Optional optimization |

---

## 4. Rủi ro còn lại

| Rủi ro | Mức | Mitigation |
|--------|-----|------------|
| Rebuild `--apply` trên prod không backup | Cao | Bắt buộc `backup-postgres.sh` trước; dry-run trước |
| `docker compose down -v` trên VPS | Cao | Doc cấm; backup guide |
| Aggregation count query load trên burst comment | Thấp | Window nhỏ; index events; có thể COUNT(*) sau |
| Reels comment thiếu `reelItemId` (client cũ) | Thấp | Fallback sync surface reels; log skip |
| Spoiler MVP không cover mọi edge paid | Trung bình | `spoiler_protection_enabled` + paid preview length |
| Moderator có thể xem admin sync page | Thấp | By design; chỉ admin.settings.update mới sửa |

---

## 5. Kiểm tra quyền (verified in code)

| Route / action | Guard |
|----------------|-------|
| `app/admin/community/story-sync/page.tsx` | `requireAdminOrModerator` |
| `saveStoryCommunitySyncSettingsAction` | `assertStaffAnyPermission(["admin.settings.update"])` |
| Backfill/rebuild tools | `admin.settings.update` |
| Feed API default filters | `visibility=visible`, `moderation_status=approved` |
| `app/admin/layout.tsx` | `STUDIO_NOINDEX_ROBOTS` |

User thường **không** có API public để sửa `community_sync_settings`.

---

## 6. Kiểm tra performance (verified in code)

| Check | Result |
|-------|--------|
| Group page feed query | `group_feed_items` WHERE `group_id` ORDER BY `created_at` — uses `(group_id, created_at desc)` index |
| Full table scan `interaction_events` on page open | **Không** — chỉ projection table |
| N+1 enrich feed | **Không** — batch `comments` + `story_reviews` by ID arrays |
| Duplicate prevention | `idempotency_key` unique; feed unique `(group_id, source_entity_type, source_entity_id, item_type)` |
| Pagination | Cursor encoded; LIMIT clamp 50 |

---

## 7. Kiểm tra SEO / private

| Check | Result |
|-------|--------|
| Admin routes noindex | ✅ `app/admin/layout.tsx` |
| Group page public | Indexable (community content) — đúng product intent |
| Hidden/moderated feed items | Không trả về API public default |

---

## 8. Kiểm tra mobile / desktop

| Check | Result |
|-------|--------|
| Horizontal scroll tabs/filters | ✅ CSS overflow-x |
| Card layout stack | ✅ |
| Bottom nav unchanged | ✅ |
| Desktop width | ✅ `page-stack` + max content |

**Manual QA recommended** trên Chrome DevTools device toolbar + desktop.

---

## 9. Test plan

### 9.1 Local

```powershell
npm run docker:local:up
npm run db:shims
npm run story-sync:backfill:dry-run
npm run story-sync:backfill          # nếu cần group
npm run community-sync:validate
npm run build
npm run dev
```

| # | Test | Expected |
|---|------|----------|
| 1 | Comment chương | Card xuất hiện group feed |
| 2 | Comment Reels (có story) | Badge Reels, target URL reel |
| 3 | Review có text | Card Review |
| 4 | Review rating-only | Không sync feed |
| 5 | Admin tắt `sync_chapter_comments` | Comment mới không lên feed |
| 6 | Pagination "Xem thêm" | Cursor load thêm items |
| 7 | Filter chips | Tab API filter đúng nguồn |
| 8 | Spoiler chương paid | Excerpt truncated / spoiler UI |
| 9 | `community-sync:validate` | All checks passed |
| 10 | Mobile viewport | Layout không vỡ |

### 9.2 VPS

| # | Step |
|---|------|
| 1 | `bash scripts/backup-postgres.sh` |
| 2 | `git pull` + `dcp up -d --build web` |
| 3 | `dcp exec web node scripts/db-apply-shims.mjs --status` |
| 4 | `dcp exec web npm run story-sync:backfill:dry-run` |
| 5 | `dcp exec web npm run story-sync:backfill` |
| 6 | `dcp exec web npm run community-sync:validate` |
| 7 | `dcp restart web` + `dcp logs web --tail=100` |
| 8 | Test 1 truyện thật + admin settings |
| 9 | Optional: `story-sync:rebuild-feed:dry-run` nếu feed lệch |

---

## 10. Acceptance criteria mapping

| Criteria | Status |
|----------|--------|
| Tài liệu local/VPS đầy đủ | ✅ |
| Checklist backup trước migration | ✅ |
| Script/hướng dẫn backfill/rebuild an toàn | ✅ |
| `npm run build` pass | ✅ |
| Admin setting hoạt động | ✅ |
| Comment chương sync group | ✅ |
| Reels/audio/phim sync (module có) | ✅ Reels + adapters |
| Group feed pagination | ✅ |
| Không duplicate event/feed item | ✅ constraints + validate |
| Không leak spoiler rõ ràng | ✅ MVP spoiler + paid preview |
| Final report rõ ràng | ✅ |

---

## 11. Module map (quick)

```
lib/community-sync/
  comment-sync.ts          # Core pipeline
  review-sync.ts           # Review → feed
  adapters/                # Reels, audio, adaptation
  projection/              # Aggregation + rebuild
  sync-settings.ts         # DB settings reader
  get-story-group-feed.ts  # Feed query
  enrich-group-feed-items.ts

app/community/story/[storyId]/page.tsx
app/api/community/story/[storyId]/feed/route.ts
app/admin/community/story-sync/page.tsx

scripts/backfill-story-groups.ts
scripts/rebuild-group-feed-projection.ts
scripts/validate-story-community-sync.ts
scripts/backup-postgres.sh
scripts/deploy/backup-postgres.sh
```

---

## 12. Sign-off notes

Tính năng **sẵn sàng vận hành** với điều kiện:

1. Migration 0031/0032 đã apply trên target DB.
2. Backfill groups đã chạy (dry-run → apply).
3. Backup trước mọi `--apply` rebuild trên production.
4. QA manual theo §9 trên staging hoặc 1 truyện canary trước khi bật rộng.

Không có thay đổi kiến trúc deploy (vẫn Docker Compose VPS). Không xóa legacy data.
