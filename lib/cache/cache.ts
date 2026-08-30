/**
 * Minimal cache abstraction. Chapter content uses {@link ./chapter-content-cache}.
 * Redis is optional — failures fall back to memory or direct S3 load.
 */

export type CacheBackend = "memory" | "redis" | "none";

export function resolveCacheBackend(): CacheBackend {
  if (process.env.REDIS_URL?.trim()) {
    return "redis";
  }
  return "memory";
}

export function chapterContentCacheTtlMs() {
  const raw = process.env.CHAPTER_CONTENT_CACHE_TTL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed >= 60_000 && parsed <= 1_800_000) {
    return parsed;
  }
  return 15 * 60 * 1000;
}
