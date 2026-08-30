/**
 * Drizzle SQL phases (fresh DB):
 *   1. Foundation 0000–0005 — auth, storage shim, PostgREST grants (before legacy)
 *   2. db/migrations/legacy — core app schema (stories, profiles, storage_assets, …)
 *   3. Extensions 0006+ — alters legacy tables (cover_media_asset, SEO, …)
 */

export function drizzleMigrationNumber(filename) {
  const match = filename.match(/^(\d{4})_.+\.sql$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function isFoundationPhaseFile(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 0 && n <= 5;
}

export function isExtensionPhaseFile(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 6;
}

/** 0001–0005 only — safe to re-run before legacy (idempotent). Excludes 0000. */
export function isPreLegacyCompatShim(filename) {
  const n = drizzleMigrationNumber(filename);
  return n !== null && n >= 1 && n <= 5;
}
