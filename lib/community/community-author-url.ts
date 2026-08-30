import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { AuthorCommunityGroup } from "@/types/community";

/** Canonical author link from community UI: `/@username` (community tab when available). */
export function getCommunityAuthorHref(
  group: Pick<AuthorCommunityGroup, "authorUsername">
): string {
  return getProfileTabUrl(group.authorUsername, "community") ?? "/community";
}

/** In-page anchor for the authors carousel on `/community`. */
export const COMMUNITY_AUTHORS_SECTION_ID = "community-authors";

export function getCommunityAuthorsSectionHref(): string {
  return `/community#${COMMUNITY_AUTHORS_SECTION_ID}`;
}
