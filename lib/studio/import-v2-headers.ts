/** Pure helpers for CSV v2 header detection (safe for client components). */

export function isStoriesImportV2Headers(headers: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return normalized.includes("content_type_slug") && normalized.includes("main_genre_slug");
}

export function isChaptersImportV2Headers(headers: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return normalized.includes("chapter_order") && normalized.includes("story_code");
}
