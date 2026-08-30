/**
 * Resolve public absolute URLs for share — prefers NEXT_PUBLIC_SITE_URL in all environments.
 */
export function getPublicSiteOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return null;
  }

  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function resolvePublicShareUrl(pathname: string): string {
  const cleaned = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const configuredOrigin = getPublicSiteOrigin();
  if (configuredOrigin) {
    try {
      return new URL(cleaned, configuredOrigin).href;
    } catch {
      // fall through
    }
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isLocal =
      origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("[::1]");

    if (process.env.NODE_ENV === "production" && isLocal) {
      return cleaned;
    }

    try {
      return new URL(cleaned, origin).href;
    } catch {
      return cleaned;
    }
  }

  return cleaned;
}
