import { permanentRedirect, redirect } from "next/navigation";

import { lookupActiveUrlRedirect } from "@/lib/urls/redirects";
import { parsePublicSegment } from "@/lib/urls/parse";
import type { PublicEntityType } from "@/lib/urls/constants";

export type CanonicalRedirectOptions = {
  currentPath: string;
  canonicalPath: string;
  statusCode?: number;
};

function normalizePath(path: string): string {
  const value = path.startsWith("/") ? path : `/${path}`;
  return value.replace(/\/+$/, "") || "/";
}

/**
 * Redirect once to canonical path if different. Never chains through url_redirects for target.
 */
export function redirectToCanonicalIfNeeded({
  currentPath,
  canonicalPath,
  statusCode = 301
}: CanonicalRedirectOptions): void {
  const current = normalizePath(currentPath);
  const canonical = normalizePath(canonicalPath);

  if (current === canonical) {
    return;
  }

  if (statusCode === 308) {
    redirect(canonical);
  }

  permanentRedirect(canonical);
}

export async function tryRedirectFromLookupTable(
  currentPath: string
): Promise<never | null> {
  const row = await lookupActiveUrlRedirect(currentPath);
  if (!row?.target_path || row.target_path === normalizePath(currentPath)) {
    return null;
  }

  if (row.status_code === 302 || row.status_code === 307) {
    redirect(row.target_path);
  }

  permanentRedirect(row.target_path);
}

export function isNumericPublicSegment(
  segment: string,
  entityType: PublicEntityType
): boolean {
  return parsePublicSegment(segment, entityType) !== null;
}

export function isLegacySlugOnlyStorySegment(segment: string): boolean {
  return !segment.includes("-s.") && !/-s\.[0-9]{8,12}$/.test(segment);
}

export function isLegacyNumericChapterSegment(segment: string): boolean {
  return /^[0-9]+$/.test(segment);
}
