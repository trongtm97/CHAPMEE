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
  page?: number
): string | null {
  const base = getProfileUrl(username);
  if (!base) {
    return null;
  }
  const params = new URLSearchParams({ tab });
  if (page != null && page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
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
