# Taxonomy migration runbook (ChapMee)

Chạy trên Supabase **theo thứ tự** (staging trước, production sau khi đã kiểm tra Studio + `/the-loai`).

## 1. Migrations

| File | Mục đích |
|------|----------|
| `160_taxonomy_system.sql` | Bảng, RLS, trigger usage count |
| `161_taxonomy_seed.sql` | ~413 nhãn mặc định + format templates |
| `162_taxonomy_backfill_legacy.sql` | Map `genre_id` / `story_tags` / `age_rating` cũ → taxonomy |
| `163_taxonomy_public_genres_rpc.sql` | RPC `get_public_main_genres_with_story_counts` |
| `164_taxonomy_ranking_and_subgenre_parents.sql` | `ranking_snapshots.taxonomy_term_id` + gắn parent subgenre |
| `165_taxonomy_notifications.sql` | Notification types cho duyệt/từ chối/gộp yêu cầu tag |
| `166_taxonomy_permissions.sql` | RBAC `taxonomy.*` cho admin/content_admin |
| **`177_drop_legacy_catalog.sql`** | Drop `stories.genre_id`, `genres`, `tags`, `story_tags` |

Sau migrate 160–166, admin có thể gắn/sửa `parent_id` cho **subgenre** tại `/admin/taxonomy`.

Cron ranking (`ranking-snapshots`) ghi snapshot `genre_stories` theo `taxonomy_term_id`.

```bash
# Ví dụ Supabase CLI (từ thư mục repo)
supabase db push
```

**Chỉ apply `177` sau khi:** app đã deploy bản không còn join `genres`/`genre_id`; smoke test pass.

## 2. Kiểm tra sau migrate

```sql
select count(*) from taxonomy_terms;
select type, count(*) from taxonomy_terms group by type order by type;
select count(*) from story_taxonomy_terms;
select count(*) from taxonomy_requests where status = 'pending';
```

Kỳ vọng: `taxonomy_terms` > 400 sau seed; `story_taxonomy_terms` > 0 sau backfill 162.

Sau 177:

```sql
-- Should fail (tables dropped):
-- select * from genres limit 1;
select count(*) from ranking_snapshots where taxonomy_term_id is not null;
```

## 3. Smoke test ứng dụng

- **Studio** `/studio/stories/new` — khối taxonomy (thể loại, trope, cảnh báo, presentation).
- **Admin** `/admin/taxonomy`, `/admin/taxonomy/unmapped` — không còn gap legacy.
- **Public** `/the-loai`, `/the-loai/[slug]`, `/truyen`, Discover — thể loại từ taxonomy.
- **Ranking** `/bang-xep-hang/theo-the-loai?genre=ngon-tinh` — snapshot theo `taxonomy_term_id`.
- **Redirect** `/genres/[slug]` → `/the-loai/[slug]`.

## 4. Regenerate types (tùy chọn)

Sau khi schema live (đặc biệt sau 177), cập nhật generated Supabase types để bỏ `genre_id`, `genres`, `tags`.

## 5. Rollback

Không xóa migration đã chạy trên production. Trước 177: có thể tắt tạm bằng `is_active = false` trên nhóm term. **Sau 177:** không rollback schema — chỉ restore từ backup DB nếu cần.

## 6. Tái seed / import

- Regenerate SQL seed: `npm run taxonomy:seed-sql`
- Kiểm tra map subgenre: `npm run taxonomy:verify-slugs`
- Admin import JSON/CSV tại `/admin/taxonomy`
- `supabase/seed.sql` — demo stories dùng `story_taxonomy_terms`, không còn `genres`/`story_tags`

## 7. Post-177 cron

Chạy lại ranking + score snapshot crons để populate boards với `taxonomy_term_id` only:

- `POST /api/cron/ranking-snapshots`
- `POST /api/cron/score-snapshots`

## 8. Catalog performance migrations (178–180)

| File | Mục đích |
|------|----------|
| `178_taxonomy_catalog_performance.sql` | Indexes taxonomy/stories + RPC filter taxonomy groups + usage_count delta |
| `179_stories_search_vector.sql` | `search_vector` GIN + RPC `search_public_story_ids` |
| `180_story_catalog_metrics_view.sql` | Materialized view `story_catalog_metrics` + RPC sort metric |

Cron refresh catalog metrics (sau score-snapshots):

- `POST /api/cron/catalog-metrics`

Thứ tự khuyến nghị: `score-snapshots` → `catalog-metrics` (view dùng `content_score_snapshots`).

Chi tiết vận hành: [`docs/catalog-performance.md`](./catalog-performance.md).

## 9. Content Taxonomy Quality

Migrations `181`–`182`. Admin: `/admin/content-taxonomy-quality`.

Cron batch check (200 truyện/lần, dùng `offset` để quét vòng):

- `POST /api/cron/taxonomy-quality-check?limit=200&offset=0`

Khuyến nghị: sau `score-snapshots` nếu bật `min_discovery_score` trên rule `hot_tag_abuse`.

Chi tiết: [`docs/content-taxonomy-quality.md`](./content-taxonomy-quality.md).
