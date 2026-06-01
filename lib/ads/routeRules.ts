/**
 * Public routes may show ads; private / creator / auth routes must not.
 */

const BLOCKED_PREFIXES = [
  "/admin",
  "/studio",
  "/me",
  "/settings",
  "/messages",
  "/wallet",
  "/coin",
  "/login",
  "/register",
  "/notifications",
  "/onboarding",
  "/vip"
] as const;

const BLOCKED_EXACT = new Set([
  "/wallet",
  "/messages",
  "/vip",
  "/onboarding",
  "/login",
  "/register",
  "/notifications",
  "/coin/checkout"
]);

/** Profile routes that may show ads when public (not under /me). */
const PUBLIC_PROFILE_PREFIXES = ["/u/", "/profile/", "/tac-gia/", "/@"] as const;

function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (!path || path === "") {
    return "/";
  }
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

export function isAdAllowedRoute(pathname: string): boolean {
  const path = normalizePath(pathname);

  if (BLOCKED_EXACT.has(path)) {
    return false;
  }

  if (BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false;
  }

  if (PUBLIC_PROFILE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  return true;
}

/** Simple glob match for page_pattern (e.g. segments with * wildcards). */
export function matchesPagePattern(
  pathname: string,
  pattern: string | null | undefined
): boolean {
  if (!pattern?.trim()) {
    return true;
  }
  const path = normalizePath(pathname);
  const parts = pattern.trim().split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (parts.length !== pathParts.length) {
    const regex = new RegExp(
      "^" +
        pattern
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\\\*/g, "[^/]+") +
        "$"
    );
    return regex.test(path);
  }
  return parts.every((part, i) => part === "*" || part === pathParts[i]);
}
