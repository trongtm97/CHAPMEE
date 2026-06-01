/**
 * Optional CLI: reminds to run migration 162 for legacy backfill.
 * Usage: node scripts/backfill-story-taxonomy.mjs
 */
console.log(
  [
    "Chạy migration SQL trên Supabase:",
    "  supabase/migrations/162_taxonomy_backfill_legacy.sql",
    "",
    "Migration sẽ:",
    "  - Gắn main_genre từ stories.genre_id",
    "  - Gắn trope_tag từ story_tags (khớp slug/tên)",
    "  - Tạo story_presentation_settings mặc định",
    "  - Gắn age_rating từ stories.age_rating",
    "  - refresh_taxonomy_usage_counts()"
  ].join("\n")
);
