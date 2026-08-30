const COMING_SOON_EXACT_PATHS = new Set([
  "/coming-soon",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/robots.txt",
  "/sitemap.xml"
]);

const COMING_SOON_PREFIXES = [
  "/api/",
  "/admin/",
  "/internal/",
  "/legal/",
  "/privacy",
  "/terms",
  "/content-policy",
  "/community-guidelines"
];

export function isComingSoonAllowlistedPath(pathname: string): boolean {
  if (COMING_SOON_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return COMING_SOON_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}
