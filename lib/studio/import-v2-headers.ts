/** Pure helpers for CSV v2 header detection (safe for client components). */

export function isChaptersImportV2Headers(headers: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return normalized.includes("chapter_order") && normalized.includes("story_code");
}

export function isStoriesImportV2Headers(headers: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  if (isChaptersImportV2Headers(headers)) {
    return false;
  }
  if (normalized.includes("content_type_slug") && normalized.includes("main_genre_slug")) {
    return true;
  }
  return normalized.includes("title");
}
