const FALLBACK_DEV_ORIGIN = "http://localhost:3000";

/**
 * Origin dùng khi parse URL tương đối trên server (redirect, returnTo).
 * Ưu tiên NEXT_PUBLIC_SITE_URL; không dùng domain cũ chapchap.local.
 */
export function getSiteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      // fall through
    }
  }

  return FALLBACK_DEV_ORIGIN;
}

export function resolveAppUrl(pathname: string) {
  return new URL(pathname, getSiteOrigin());
}
