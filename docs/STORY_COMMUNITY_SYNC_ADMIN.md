# Story Community Sync — Admin

Trang admin cấu hình đồng bộ tương tác vào nhóm truyện (`story_groups` → `group_feed_items`).

## Route

- **URL:** `/admin/community/story-sync`
- **Quyền xem:** admin / moderator (`requireAdminOrModerator`)
- **Quyền sửa & chạy tool:** `admin.settings.update`

## Storage

Settings lưu trong bảng `community_sync_settings` (key/value JSONB), **không** hard-code trong service.

| DB key | Mô tả ngắn |
|--------|------------|
| `auto_create_story_group` | Tự tạo nhóm khi có tương tác |
| `sync_chapter_comments` | Bình luận chương |
| `sync_reel_comments` | Bình luận Reels |
| `sync_audio_comments` | Bình luận audio |
| `sync_adaptation_comments` | Bình luận phim/chuyển thể |
| `sync_reviews` | Review truyện |
| `sync_author_replies` | Trả lời tác giả |
| `collapse_window_minutes` | Cửa sổ gom hoạt động (5–240) |
| `max_activity_items_per_source_per_hour` | Ngưỡng trước khi aggregate (1–50) |
| `min_comment_length_to_surface` | Độ dài tối thiểu (0–100) |
| `hide_spam_from_group` | Ẩn spam/flagged |
| `require_moderation_for_new_accounts` | Tài khoản < 3 ngày cần approved |
| `spoiler_protection_enabled` | Bật metadata/UI spoiler |
| `paid_chapter_comment_preview` | Giới hạn excerpt chương trả phí (20–200) |
| `author_can_pin_group_items` | Quyền ghim (UI tác giả sau) |
| `author_can_hide_group_items` | Quyền ẩn item |
| `notify_group_members_default` | `all` / `important_only` / `none` |

Backend đọc qua `getCommunitySyncSettings()` — fallback `DEFAULT_COMMUNITY_SYNC_SETTINGS` nếu thiếu bảng/row.

## Audit

Mỗi setting thay đổi ghi `admin_audit_logs`:

- `action`: `community_sync_setting_updated`
- `target_type`: `community_sync_settings`
- `target_id`: setting key
- `metadata`: `{ setting_key, old_value, new_value, changed_at }`

Tool actions:

- `community_sync_backfill_dry_run` / `community_sync_backfill_apply`
- `community_sync_rebuild_projection_dry_run` / `community_sync_rebuild_projection_apply`

Xem tại `/admin/audit`.

## Công cụ vận hành

| Tool | Dry-run | Apply | Xác nhận |
|------|---------|-------|----------|
| Backfill `story_groups` | Có — không ghi DB | Tạo group thiếu | Nhập `BACKFILL` |
| Rebuild feed projection | Có — chỉ đếm | Upsert từ `interaction_events` | Nhập `REBUILD` |

**Không** xóa database. **Không** tự chạy khi mở trang.

### VPS / Production

1. Backup DB trước rebuild projection thật.
2. Chạy migration nếu chưa có key mới:
   ```bash
   npm run db:shims
   ```
   (áp dụng `drizzle/0032_community_sync_settings_extended.sql`)
3. Test thay đổi nhỏ (ví dụ `collapse_window_minutes`) trước khi chạy tool nặng.

### CLI tương đương (local)

```bash
npm run community-sync:backfill-story-groups          # dry-run (default)
npm run community-sync:backfill-story-groups -- --apply
npm run community-sync:validate
```

## Phân biệt cấu hình cộng đồng khác

| Bảng / key | Mục đích |
|------------|----------|
| `app_settings.community_spam_settings` | Rate limit, từ khóa spam |
| `community_sync_settings` | Đồng bộ comment → feed nhóm truyện |
| `community_group_settings` | Khóa post, ẩn khỏi đề xuất (legacy UI) |

## Validation local

1. Login admin có `admin.settings.update`
2. Mở `/admin/community/story-sync`
3. Tắt `sync_chapter_comments` → lưu → tạo comment test → không xuất hiện feed
4. Bật lại → comment mới sync
5. Dry-run backfill → kiểm tra số ứng viên
6. Dry-run rebuild → kiểm tra số events
7. `/admin/audit` — thấy log `community_sync_setting_updated`

## Files

- `app/admin/community/story-sync/page.tsx`
- `components/admin/StoryCommunitySyncAdminPage.tsx`
- `components/admin/community/StoryCommunitySyncSettingsForm.tsx`
- `components/admin/community/StoryCommunitySyncToolsPanel.tsx`
- `lib/admin/community-sync-settings-actions.ts`
- `lib/community-sync/settings.ts` — metadata UI + clamp
- `lib/community-sync/sync-settings.ts` — read/upsert
- `lib/community-sync/rebuild-group-feed-projection.ts`
