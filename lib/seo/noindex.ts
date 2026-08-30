import type { Metadata } from "next";

export const STUDIO_NOINDEX_ROBOTS = {
  index: false as const,
  follow: false as const
};

export type SeoDefaultRule = {
  pattern: string;
  pageType: string;
  indexable: boolean;
  followLinks: boolean;
};

/** Routes that must never be indexed by default. */
export const DEFAULT_NOINDEX_ROUTE_PATTERNS: SeoDefaultRule[] = [
  { pattern: "/studio", pageType: "studio", indexable: false, followLinks: false },
  { pattern: "/admin", pageType: "admin", indexable: false, followLinks: false },
  { pattern: "/login", pageType: "auth", indexable: false, followLinks: false },
  { pattern: "/register", pageType: "auth", indexable: false, followLinks: false },
  { pattern: "/me", pageType: "profile_private", indexable: false, followLinks: false },
  { pattern: "/settings", pageType: "settings", indexable: false, followLinks: false },
  { pattern: "/messages", pageType: "messages", indexable: false, followLinks: false },
  { pattern: "/notifications", pageType: "notifications", indexable: false, followLinks: false },
  { pattern: "/wallet", pageType: "wallet", indexable: false, followLinks: false },
  { pattern: "/coin", pageType: "coin", indexable: false, followLinks: false },
  { pattern: "/checkout", pageType: "checkout", indexable: false, followLinks: false },
  { pattern: "/payment", pageType: "payment", indexable: false, followLinks: false },
  { pattern: "/draft", pageType: "draft", indexable: false, followLinks: false },
  { pattern: "/preview", pageType: "preview", indexable: false, followLinks: false },
  { pattern: "/onboarding", pageType: "onboarding", indexable: false, followLinks: false },
  { pattern: "/creator", pageType: "creator_workspace", indexable: false, followLinks: false }
];

export const DEFAULT_INDEX_ROUTE_PATTERNS: Array<{
  pattern: string;
  pageType: string;
}> = [
  { pattern: "/", pageType: "home" },
  { pattern: "/discover", pageType: "discover" },
  { pattern: "/media", pageType: "media" },
  { pattern: "/reels", pageType: "reels" },
  { pattern: "/truyen", pageType: "story_catalog" },
  { pattern: "/truyen-sang-tac", pageType: "story_catalog" },
  { pattern: "/truyen-dich", pageType: "story_catalog" },
  { pattern: "/media", pageType: "media" },
  { pattern: "/bai-viet", pageType: "content_post" },
  { pattern: "/chinh-sach", pageType: "policy_catalog" },
  { pattern: "/thong-bao", pageType: "announcement_catalog" },
  { pattern: "/the-loai", pageType: "genre" },
  { pattern: "/tag", pageType: "tag" },
  { pattern: "/community", pageType: "community" },
  { pattern: "/bang-xep-hang", pageType: "ranking" }
];

const NON_INDEXABLE_CONTENT_STATUSES = new Set([
  "draft",
  "hidden",
  "archived",
  "private",
  "rejected",
  "pending"
]);

export function normalizePathname(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path || "/";
}

export function patternMatchesRoute(pattern: string, pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }

  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return normalized.startsWith(prefix);
  }

  return normalized === pattern;
}

export function hasPreviewQuery(search: string | URLSearchParams | null | undefined) {
  if (!search) {
    return false;
  }

  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  return params.get("preview") === "1" || params.get("preview") === "true";
}

export function getDefaultSeoRule(pathname: string): SeoDefaultRule | null {
  const normalized = normalizePathname(pathname);

  for (const rule of DEFAULT_NOINDEX_ROUTE_PATTERNS) {
    if (patternMatchesRoute(rule.pattern, normalized)) {
      return rule;
    }
  }

  for (const rule of DEFAULT_INDEX_ROUTE_PATTERNS) {
    if (patternMatchesRoute(rule.pattern, normalized)) {
      return { ...rule, indexable: true, followLinks: true };
    }
  }

  if (normalized.startsWith("/thong-bao/")) {
    return {
      pattern: "/thong-bao/*",
      pageType: "announcement",
      indexable: false,
      followLinks: false
    };
  }

  if (normalized.startsWith("/truyen/")) {
    return {
      pattern: "/truyen/*",
      pageType: "story",
      indexable: true,
      followLinks: true
    };
  }

  if (/^\/@[a-z0-9](?:[a-z0-9.]{1,28}[a-z0-9])?$/i.test(normalized)) {
    return {
      pattern: "/@username",
      pageType: "public_profile",
      indexable: true,
      followLinks: true
    };
  }

  if (normalized.startsWith("/bai-viet/")) {
    return {
      pattern: "/bai-viet/*",
      pageType: "content_post",
      indexable: true,
      followLinks: true
    };
  }

  return null;
}

export type ShouldNoIndexInput = {
  pathname: string;
  search?: string | URLSearchParams | null;
  contentStatus?: string | null;
  indexableOverride?: boolean | null;
  robotsIndexOverride?: boolean | null;
  ruleIndexable?: boolean | null;
};

export function shouldNoIndexPath(input: ShouldNoIndexInput | string): boolean {
  const resolved: ShouldNoIndexInput =
    typeof input === "string" ? { pathname: input } : input;

  if (hasPreviewQuery(resolved.search)) {
    return true;
  }

  if (resolved.indexableOverride === false || resolved.robotsIndexOverride === false) {
    return true;
  }

  if (resolved.indexableOverride === true || resolved.robotsIndexOverride === true) {
    return false;
  }

  if (
    resolved.contentStatus &&
    NON_INDEXABLE_CONTENT_STATUSES.has(resolved.contentStatus.toLowerCase())
  ) {
    return true;
  }

  if (resolved.ruleIndexable != null) {
    return !resolved.ruleIndexable;
  }

  const fallback = getDefaultSeoRule(resolved.pathname);
  if (fallback) {
    return !fallback.indexable;
  }

  return false;
}

/** @deprecated Use shouldNoIndexPath */
export function shouldNoIndexRoute(pathname: string, rule?: { indexable: boolean } | null) {
  return shouldNoIndexPath({
    pathname,
    ruleIndexable: rule?.indexable ?? null
  });
}

export function buildRobotsMeta(input: {
  indexable: boolean;
  followLinks?: boolean;
}): Metadata["robots"] {
  if (!input.indexable) {
    return STUDIO_NOINDEX_ROBOTS;
  }

  return {
    index: true,
    follow: input.followLinks ?? true
  };
}

export function buildPrivateRouteMetadata(title: string): Metadata {
  return {
    title,
    robots: STUDIO_NOINDEX_ROBOTS
  };
}
