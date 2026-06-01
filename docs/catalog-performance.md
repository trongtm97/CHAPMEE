# Catalog & Taxonomy Performance

Tài liệu triển khai và vận hành cho migrations 178–180 và các tối ưu catalog.

## Migrations (theo thứ tự)

1. `177_drop_legacy_catalog.sql` — xóa bảng legacy genre/tag (chỉ sau khi app đã taxonomy-only)
2. `178_taxonomy_catalog_performance.sql` — index taxonomy + RPC `filter_public_story_ids_by_taxonomy_groups`
3. `179_stories_search_vector.sql` — `search_vector` + RPC `search_public_story_ids`
4. `180_story_catalog_metrics_view.sql` — materialized view + RPC sort theo metric

## Cron jobs

| Endpoint | Tần suất gợi ý | Mục đích |
|----------|----------------|----------|
| `POST /api/cron/score-snapshots` | 15–30 phút | Điểm hot/trending |
| `POST /api/cron/catalog-metrics` | 5–15 phút | Refresh `story_catalog_metrics` + invalidate cache catalog |
| `POST /api/cron/ranking-snapshots` | hàng ngày | Bảng xếp hạng |

Header: `Authorization: Bearer $CRON_SECRET`

## Kiến trúc catalog

```
getStoryCatalogPage()
  └─ getPublicStoriesCatalog()
       ├─ resolve story IDs (taxonomy RPC / search RPC / full set)
       ├─ sort branch: date (DB offset) | metric (mat view) | score | quick
       └─ hydrate story cards (projection nhẹ, không structured_content)
```

Cache:

- `getPublicStoriesCatalogCached` — tag `story-catalog`, TTL 60s
- `getCatalogFilterOptionsCached` — tag `catalog-filter-options`, TTL 300s
- `getTaxonomyLandingCatalogCached` — per term slug, TTL 60s
- `getCachedDiscoverTaxonomyTerms` — discover home

Invalidation: admin taxonomy CRUD → `revalidateTaxonomySurfaces()` (taxonomy + discover + catalog + filter options).

## Pagination

- Page sizes: 20 / 40 / 60 (max 100) — `lib/shared/pagination.ts`
- Studio list: DB pagination khi sort `updated|created|title`, filter `all`, không search; hỗ trợ lọc taxonomy qua pre-filter IDs
- Keyset cursor helpers: `lib/shared/cursor-pagination.ts` (sẵn sàng cho sort theo ngày khi catalog lớn)

## EXPLAIN ANALYZE (staging)

Chạy trên Supabase SQL editor sau khi apply migrations:

```sql
-- Taxonomy filter RPC
explain (analyze, buffers)
select * from filter_public_story_ids_by_taxonomy_groups(
  array[
    array(select id from taxonomy_terms where slug = 'ngon-tinh' limit 1)::uuid
  ]
);

-- Full-text search
explain (analyze, buffers)
select * from search_public_story_ids('truyện ngắn', 40, 0);

-- Metric sort
explain (analyze, buffers)
select * from get_catalog_story_ids_by_metric('hot', null, 'desc', 40, 0);

-- Public catalog date sort
explain (analyze, buffers)
select id from stories
where visibility = 'public'
  and status in ('published', 'approved')
  and coalesce(permanently_hidden_low_quality, false) = false
order by updated_at desc
limit 40 offset 0;
```

Dev slow-query logging: `lib/dev/slow-query-log.ts` (bật qua env nếu cần).

## Checklist hoàn thành

- [x] Taxonomy-only catalog (không `genres`/`tags` legacy)
- [x] RPC taxonomy filter + usage_count delta
- [x] Search vector + fallback ILIKE
- [x] Materialized view metrics + cron refresh
- [x] Unified `getStoryCatalogPage` + cached wrappers
- [x] Studio DB pagination (+ taxonomy pre-filter)
- [x] Discover / taxonomy landing cache
- [x] Admin taxonomy invalidates catalog caches
- [ ] Apply migrations 177–180 trên staging/prod
- [ ] Cấu hình cron trên hosting
- [ ] EXPLAIN trên staging với dữ liệu thật

## Composer

Không sửa `lib/composer/**` trong phạm vi tối ưu catalog này.
