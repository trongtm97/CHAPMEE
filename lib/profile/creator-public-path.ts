import { getProfileUrl, getProfileUrlOrFallback } from "@/lib/profile/profile-url";

/**
 * @deprecated Use getProfileUrl — kept for gradual migration.
 */
export function getCreatorPublicPath(input: {
  username?: string | null;
  creatorProfileId?: string | null;
}): string {
  const profileUrl = getProfileUrl(input.username);
  if (profileUrl) {
    return profileUrl;
  }

  return "/discover";
}

export function getCreatorPublicAbsolutePath(
  input: Parameters<typeof getCreatorPublicPath>[0]
): string {
  return getCreatorPublicPath(input);
}

export { getProfileUrl, getProfileUrlOrFallback };
