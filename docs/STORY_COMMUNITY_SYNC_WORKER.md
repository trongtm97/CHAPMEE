# Story Community Sync — Projection & Worker

Cơ chế projection đẩy `interaction_events` → `group_feed_items` với gom nhóm và rate limit.

## Kiến trúc

```
Comment create (request path)
  → createInteractionEvent (idempotent)
  → projectCommentToGroupFeed (lib/community-sync/projection)
       ├─ author reply → card riêng (ưu tiên, bypass gom)
       ├─ event count ≤ max → card riêng (per comment)
       └─ event count > max → aggregated_comments (1 card / nguồn / cửa sổ)
```

Không dùng Redis/queue. Rebuild chạy qua script/cron nhẹ.

## Bucket gom nhóm

Cùng các khóa trong `collapse_window_minutes`:

- `story_id`
- `source_entity_type` (vd. `chapter`)
- `source_entity_id` (vd. episode UUID)
- `event_type` (vd. `comment_created`)

## aggregated_comments metadata

Lưu JSON trong `group_feed_items.title`:

```json
{
  "count": 42,
  "windowMinutes": 30,
  "windowStartedAt": "...",
  "windowEndedAt": "...",
  "latestActorUserId": "...",
  "latestCommentId": "...",
  "latestExcerpt": "...",
  "targetUrl": "..."
}
```

`excerpt` hiển thị: `42 bình luận mới trong 30 phút qua`.  
`source_comment_id` trỏ comment mới nhất để enrich actor.

## Rate limit

Admin setting `max_activity_items_per_source_per_hour` (thực tế dùng chung cửa sổ với `collapse_window_minutes`):

- Tối đa **N card riêng** mỗi nguồn trong cửa sổ
- Comment thứ **N+1** trở đi → cập nhật 1 card `aggregated_comments`
- 50 comment cùng chương → tối đa N card + 1 aggregated (không phải 50 card)

## Chống spam / moderation

| Trường hợp | Hành vi |
|------------|---------|
| Comment quá ngắn | Không sync (trừ tác giả / author reply) |
| Spam / flagged + `hide_spam_from_group` | Event + feed item `visibility=hidden` |
| Tài khoản mới + `require_moderation_for_new_accounts` | Event `pending`, feed `moderated` (ẩn khỏi feed public) |
| Comment hidden/delete | `updateGroupFeedItemVisibilityFromCommentStatus` |

## Author priority

- `author_reply` luôn tạo card riêng khi `sync_author_replies=true`
- Score cao hơn (40 vs 10)
- Không bị gom vào aggregated bucket

## Module

```
lib/community-sync/projection/
  aggregation-bucket.ts   # đếm event trong cửa sổ
  aggregate-feed-item.ts  # upsert aggregated_comments
  project-from-event.ts   # projection sync-time
  rebuild-projection.ts   # rebuild batch
  index.ts
```

## Scripts

### Rebuild projection (dry-run mặc định)

```bash
# Dry-run — không ghi DB
npm run community-sync:rebuild-feed

# Dry-run tường minh
npm run community-sync:rebuild-feed -- --dry-run

# Apply — upsert feed từ events (backup DB trước trên VPS)
npm run community-sync:rebuild-feed -- --apply

# Batch nhỏ, tiếp offset
npm run community-sync:rebuild-feed -- --dry-run --batch-size=200 --offset=0 --max-batches=5
npm run community-sync:rebuild-feed -- --dry-run --offset=1000
```

### Backfill groups

```bash
npm run community-sync:backfill-story-groups
npm run community-sync:backfill-story-groups -- --apply
```

### Validate

```bash
npm run community-sync:validate
```

## Local validation

1. Tạo nhiều comment cùng chương (> max setting, mặc định 5)
2. Mở `/community/story/{slug}` → thấy ≤5 card + 1 aggregated
3. Reply tác giả → card riêng nổi bật
4. Ẩn comment → feed item hidden
5. `npm run community-sync:rebuild-feed` → dry-run log projected/aggregated counts
6. `npm run community-sync:rebuild-feed -- --apply` trên DB test

## VPS (cẩn thận)

1. **Chỉ dry-run trước:** `npm run community-sync:rebuild-feed`
2. **Backup DB** trước `--apply`
3. Chạy batch nhỏ: `--batch-size=200 --max-batches=5`
4. Kiểm tra log `aggregated` / `individual` / `errors`
5. Tiếp offset nếu `has more: true`
6. Hoặc dùng admin `/admin/community/story-sync` → Tools (cùng logic)

## Admin UI

`/admin/community/story-sync` — Tools panel gọi cùng `rebuildGroupFeedProjection()`.

## Idempotency

- Events: unique `idempotency_key`
- Feed items: unique `(group_id, source_entity_type, source_entity_id, item_type)`
- Rebuild re-run an toàn — upsert, không xóa dữ liệu cũ

## Cron gợi ý (VPS)

```cron
# Dry-run hàng ngày (log only) — tùy chọn
0 4 * * * cd /path/to/chapchap && npm run community-sync:rebuild-feed >> /var/log/chapchap-sync.log 2>&1
```

Không auto `--apply` trên production.

## Multi-source sync (Reels / Audio / Phim / Review)

Adapters trong `lib/community-sync/adapters/` chuẩn hóa payload trước khi gọi `syncStoryCommentToGroup`:

| Nguồn | Adapter | Admin toggle |
|-------|---------|--------------|
| Reels | `reels-sync-adapter.ts` | `sync_reel_comments` |
| Audio | `audio-sync-adapter.ts` (wire khi module có) | `sync_audio_comments` |
| Phim/Trailer | `adaptation-sync-adapter.ts` | `sync_adaptation_comments` |
| Review | `review-sync.ts` | `sync_reviews` |

### Reels

- Comment từ `/api/reels/comments` gửi `reelItemId`, slug/publicCode/href → `source_entity_type=reel`
- `target_url` qua `resolveSyncTargetUrl` (deep link reel nếu có route)
- Spoiler từ chương liên kết (`resolveSpoilerLevelForLinkedChapter`)
- Thiếu `story_id` → log dev + skip, không crash

### Audio / Phim (placeholder)

- Interface sẵn: `AudioCommentSyncContext`, `AdaptationCommentSyncContext`
- Gọi `syncAudioCommentToStoryGroup` / `syncAdaptationCommentToStoryGroup` từ module comment tương ứng
- Không fake UI hay dữ liệu người dùng

### Review

- `upsertStoryReview` → `syncStoryReviewToGroup` khi có title/body meaningful
- Rating-only không tạo feed item

### Filter UI nhóm truyện

Tab **Hoạt động** có chip lọc (`GROUP_FEED_FILTERS`):

- Tất cả / Truyện-Chương / Reels / Audio / Phim / Review
- Chip chỉ hiện khi có dữ liệu feed hoặc module bật (audio/phim/review)

API feed: `?tab=reels|audio|films|reviews|chapters`

## Liên quan

- `docs/STORY_COMMUNITY_SYNC_MIGRATION.md` — schema
- `docs/STORY_COMMUNITY_SYNC_ADMIN.md` — admin settings
