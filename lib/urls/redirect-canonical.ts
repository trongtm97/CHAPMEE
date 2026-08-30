import type { PublicEntityType } from "@/lib/urls/constants";
import { parsePublicSegment } from "@/lib/urls/parse";

function normalizePath(path: string): string {
  const value = path.startsWith("/") ? path : `/${path}`;
  return value.replace(/\/+$/, "") || "/";
}

function isPrivateAppPath(path: string): boolean {
  const norm = normalizePath(path);
  return (
    norm.startsWith("/studio") ||
    norm.startsWith("/admin") ||
    norm.startsWith("/creator") ||
    norm.startsWith("/me")
  );
}

/**
 * Prefer computed public-code URLs for redirects when stored canonical is legacy slug-only.
 */
export function pickPublicRedirectPath(
  stored: string | null | undefined,
  computed: string,
  segmentEntity: PublicEntityType
): string {
  const computedNorm = normalizePath(computed);
  const storedTrimmed = stored?.trim();
  if (!storedTrimmed) {
    return computedNorm;
  }

  if (isPrivateAppPath(storedTrimmed)) {
    return computedNorm;
  }

  const storedNorm = normalizePath(storedTrimmed);
  if (storedNorm === computedNorm) {
    return computedNorm;
  }

  const lastSegment = storedNorm.split("/").filter(Boolean).pop() ?? "";
  if (!parsePublicSegment(lastSegment, segmentEntity)) {
    return computedNorm;
  }

  return storedNorm;
}
