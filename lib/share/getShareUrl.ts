import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { resolvePublicShareUrl } from "@/lib/site/site-url";

/** Absolute public URL for sharing — prefers configured site origin, then browser origin. */
export function getShareUrl(pathname: string): string {
  return buildCanonicalUrl(pathname) ?? resolvePublicShareUrl(pathname);
}

/** Resolve payload URL to a full shareable link (never a bare path when origin is available). */
export function resolvePayloadShareUrl(url: string | null | undefined): string {
  const trimmed = url?.trim();
  if (!trimmed) {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "/";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return getShareUrl(trimmed);
}
