# Content Taxonomy Quality

Hệ thống phát hiện và xử lý truyện có phân loại/tag/cảnh báo nội dung chưa đúng. **Khác** với:

- **Composer Publishing Check** — cấu trúc block/chapter (`structured_content`)
- **Content Quality** (`/admin/content-quality`) — lifecycle nội dung chất lượng thấp (ẩn, tắt monetization)
- **Content moderation** (`/admin/content`) — duyệt publish

## Admin UI

- Trang chính: `/admin/content-taxonomy-quality`
- Tabs: tổng quan, truyện cần rà soát, tag lạm dụng, thiếu cảnh báo, import lỗi, yêu cầu tác giả, rule
- Quick-edit taxonomy (không đụng Composer)
- Gửi yêu cầu chỉnh sửa → Studio Content Health
- Gắn flag thủ công (slug/ID + lý do)

## Studio

- `/studio/content-health` — panel `CreatorTaxonomyRevisionPanel` cho yêu cầu từ admin

## Rule engine (không AI)

File: `lib/content-taxonomy-quality/rule-engine.ts`

| Rule key | Mô tả |
|----------|--------|
| `missing_required` | Thiếu taxonomy bắt buộc / chưa xác nhận cảnh báo |
| `too_many_tags` | Vượt giới hạn tag theo loại |
| `hot_tag_abuse` | Quá nhiều featured tag, report sai tag, hoặc featured + discovery score thấp |
| `conflicting_taxonomy` | Mâu thuẫn age/warning/genre/presentation |
| `missing_warning` | Report thiếu cảnh báo vượt ngưỡng |
| `user_reported_wrong_tag` | Report taxonomy vượt ngưỡng |
| `import_error` | Lỗi taxonomy khi import batch |
| `taxonomy_behavior_mismatch` | Placeholder (disabled) — cần analytics retention |

Khi chạy lại kiểm tra, flag hệ thống không còn phát hiện sẽ **tự resolve** (trừ `admin_manual`).

## Cron

```http
POST /api/cron/taxonomy-quality-check?secret=CRON_SECRET&limit=200&offset=0
Authorization: Bearer CRON_SECRET
```

- Quét `published` + `approved` stories theo `updated_at` desc
- Response có `nextOffset` — lần chạy tiếp dùng offset đó cho đến khi quay về `0`
- Khuyến nghị: chạy sau `score-snapshots` nếu bật rule `min_discovery_score` trên `hot_tag_abuse`

## Tích hợp tự động

- **Import V2** — `recordImportBatchTaxonomyFlags` sau job import
- **User report** — `syncTaxonomyReportFlags` khi tạo report taxonomy-related
- **Admin sửa taxonomy / duyệt revision** — chạy lại check cho story

## Database

Migrations:

- `181_content_taxonomy_quality.sql` — flags, rules, revision requests, RBAC
- `182_content_taxonomy_quality_notifications.sql` — notification type `taxonomy_revision_requested`

## RBAC permissions

- `content_taxonomy_quality.view`
- `content_taxonomy_quality.review`
- `content_taxonomy_quality.edit_story_taxonomy`
- `content_taxonomy_quality.request_creator_revision`
- `content_taxonomy_quality.manage_rules`

## Validation checklist

1. `npx supabase db push` — migrations 181–182 applied
2. Admin mở `/admin/content-taxonomy-quality` — summary + tabs load
3. Bấm "Chạy kiểm tra lại" — flags xuất hiện cho truyện thiếu taxonomy
4. Sửa taxonomy admin → flag resolve
5. Gửi revision → creator thấy panel + notification
6. Cron endpoint trả `processed` > 0
