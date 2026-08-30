import {
  isValidUsernameShape,
  USERNAME_PATH_REGEX
} from "@/lib/username/normalize-username";

/**
 * Canonical public profile URL: /@username
 */
export function getProfileUrl(username: string | null | undefined): string | null {
  const normalized = username?.trim().toLowerCase() ?? "";
  if (!isValidUsernameShape(normalized)) {
    return null;
  }
  return `/@${normalized}`;
}

/** Profile URL or a safe fallback when username is missing. */
export function getProfileUrlOrFallback(
  username: string | null | undefined,
  fallback = "/discover"
): string {
  return getProfileUrl(username) ?? fallback;
}

/**
 * Public creator link: prefer `/@username`.
 * Fallback `/author/:userId` only accepts `profiles.id` (auth user id), never `creator_profiles.id`.
 */
export function getCreatorPublicHref(input: {
  username?: string | null;
  /** `profiles.id` / auth user id — NOT `creator_profiles.id`. */
  userId?: string | null;
}): string | null {
  const profileUrl = getProfileUrl(input.username);
  if (profileUrl) {
    return profileUrl;
  }

  return null;
}

const AT_PROFILE_PATH = new RegExp(
  `^/@(${USERNAME_PATH_REGEX})(?:/|$)`,
  "i"
);

export function isAtProfilePath(pathname: string): boolean {
  return AT_PROFILE_PATH.test(pathname);
}

export function parseProfileUsernameFromPath(pathname: string): string | null {
  const match = pathname.match(AT_PROFILE_PATH);
  const candidate = match?.[1]?.toLowerCase() ?? null;
  if (!candidate || !isValidUsernameShape(candidate)) {
    return null;
  }
  return candidate;
}

export function getProfileTabUrl(
  username: string | null | undefined,
  tab: string,
  page?: number,
  extra?: Record<string, string | undefined>
): string | null {
  const base = getProfileUrl(username);
  if (!base) {
    return null;
  }
  const params = new URLSearchParams({ tab });
  if (page != null && page > 1) {
    params.set("page", String(page));
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value?.trim()) {
        params.set(key, value.trim());
      }
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Profile tab URL preserving current query (sort, page). */
export function getProfileTabUrlFromSearch(
  username: string | null | undefined,
  tab: string,
  searchParams: { page?: string; sort?: string }
): string | null {
  return getProfileTabUrl(username, tab, Number(searchParams.page) || 1, {
    sort: searchParams.sort
  });
}

export function getProfileCollectionUrl(
  username: string | null | undefined,
  collectionId: string
): string | null {
  const base = getProfileUrl(username);
  if (!base || !collectionId) {
    return null;
  }
  return `${base}/collections/${collectionId}`;
}

/** Canonical share path for a public profile — never `/me/{uuid}`. */
export function getPublicProfileSharePath(
  username: string | null | undefined
): string | null {
  return getProfileUrl(username);
}
