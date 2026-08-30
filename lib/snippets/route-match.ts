import {
  DEFAULT_EXCLUDED_ROUTE_PREFIXES,
  LEGAL_ROUTE_PREFIXES,
  PAGE_GROUP_ROUTE_PREFIXES
} from "@/lib/snippets/constants";
import type { SnippetPlacementConfig, SnippetType } from "@/lib/snippets/types";

function normalizePath(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path || "/";
}

export function isDefaultExcludedRoute(pathname: string) {
  const path = normalizePath(pathname);
  return DEFAULT_EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function isLegalRoute(pathname: string) {
  const path = normalizePath(pathname);
  return LEGAL_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function matchExactOrWildcard(pattern: string, pathname: string) {
  const path = normalizePath(pathname);
  const normalizedPattern = normalizePath(pattern);

  if (normalizedPattern.endsWith("/*")) {
    const base = normalizedPattern.slice(0, -2);
    return path === base || path.startsWith(`${base}/`);
  }

  return path === normalizedPattern;
}

function matchPageGroup(group: string | null | undefined, pathname: string) {
  if (!group?.trim()) return false;
  const prefixes = PAGE_GROUP_ROUTE_PREFIXES[group.trim()];
  if (!prefixes?.length) return false;
  const path = normalizePath(pathname);
  return prefixes.some((prefix) => {
    if (prefix.endsWith("/")) {
      return path.startsWith(prefix);
    }
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export function snippetAllowedOnRoute(input: {
  pathname: string;
  placementConfig: SnippetPlacementConfig;
  routePatterns: string[];
  surfaceKeys: string[];
  type: SnippetType;
}) {
  const { pathname, placementConfig, routePatterns, type } = input;

  if (isDefaultExcludedRoute(pathname)) {
    return false;
  }

  const onLegal = isLegalRoute(pathname);
  if (onLegal) {
    const allowLegal = placementConfig.allowOnLegalRoutes ?? true;
    if (!allowLegal) return false;
    const allowScripts = placementConfig.allowScriptsOnLegal ?? false;
    if (!allowScripts && type !== "custom_css" && type !== "safe_html") {
      return false;
    }
  }

  const mode = placementConfig.mode ?? "global";

  if (mode === "global") {
    return true;
  }

  if (mode === "page_group") {
    return matchPageGroup(placementConfig.pageGroup, pathname);
  }

  if (mode === "route") {
    const patterns = routePatterns.filter(Boolean);
    if (!patterns.length) return false;
    return patterns.some((pattern) => matchExactOrWildcard(pattern, pathname));
  }

  if (mode === "surface") {
    return input.surfaceKeys.length > 0;
  }

  return false;
}

export function matchesDevice(
  target: "all" | "mobile" | "desktop",
  viewport: "mobile" | "desktop" | "unknown"
) {
  if (target === "all" || viewport === "unknown") return true;
  return target === viewport;
}
