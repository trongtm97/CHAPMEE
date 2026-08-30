/**
 * Central noindex policy for ChapMee SEO surfaces.
 * Use `isNoIndexPath()` in metadata, sitemap filters, and route handlers.
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seoOverrides } from "@/lib/db/schema/seo-center";
import { SEO_DEFAULT_LOCALE } from "@/lib/seo/seo-constants";
import {
  hasPreviewQuery,
  normalizePathname,
  shouldNoIndexPath,
  type ShouldNoIndexInput
} from "@/lib/seo/noindex";
import { normalizeSeoPath, isPrivateSeoPath } from "@/lib/seo/seo-validation";
import { LEGACY_PROFILE_ROUTE_PREFIXES } from "@/lib/seo/legacy-profile-routes";

export {
  shouldNoIndexPath,
  hasPreviewQuery,
  normalizePathname,
  buildRobotsMeta,
  buildPrivateRouteMetadata,
  DEFAULT_NOINDEX_ROUTE_PATTERNS,
  STUDIO_NOINDEX_ROBOTS
} from "@/lib/seo/noindex";

export type { ShouldNoIndexInput };

/** Legacy profile URL prefixes — canonical is `/@username`, exclude from sitemap. */
export function isLegacyProfilePath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return LEGACY_PROFILE_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

/**
 * Sync noindex check: private routes, draft/preview, content status, SEO override flag when provided.
 */
export function isNoIndexPath(input: ShouldNoIndexInput | string): boolean {
  const resolved: ShouldNoIndexInput =
    typeof input === "string" ? { pathname: input } : input;

  const path = normalizePathname(resolved.pathname);

  if (isPrivateSeoPath(path) || isLegacyProfilePath(path)) {
    return true;
  }

  return shouldNoIndexPath(resolved);
}

/** Load enabled seo_override robots_index=false for exact path (cached per request). */
export async function getSeoOverrideNoindexForPath(
  pathname: string,
  locale = SEO_DEFAULT_LOCALE
): Promise<boolean> {
  const path = normalizeSeoPath(pathname);
  const rows = await db
    .select({ robotsIndex: seoOverrides.robotsIndex })
    .from(seoOverrides)
    .where(
      and(
        eq(seoOverrides.path, path),
        eq(seoOverrides.locale, locale),
        eq(seoOverrides.isEnabled, true)
      )
    )
    .limit(1);

  const row = rows[0];
  return row?.robotsIndex === false;
}

export async function isNoIndexPathWithOverrides(
  input: ShouldNoIndexInput | string,
  locale = SEO_DEFAULT_LOCALE
): Promise<boolean> {
  const resolved: ShouldNoIndexInput =
    typeof input === "string" ? { pathname: input } : input;

  if (isNoIndexPath(resolved)) {
    return true;
  }

  const overrideNoindex = await getSeoOverrideNoindexForPath(resolved.pathname, locale);
  return overrideNoindex;
}
