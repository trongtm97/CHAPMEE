export const publicContentStatuses = ["approved", "published"] as const;

export type PublicContentStatus = (typeof publicContentStatuses)[number];
export type StoryVisibility = "public" | "private";
export type CommunityPostVisibilityStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export function canViewPublicStory(
  status: string | null | undefined,
  visibility: string | null | undefined
) {
  return (
    visibility === "public" &&
    publicContentStatuses.includes(status as PublicContentStatus)
  );
}

export function canViewPublicEpisode(
  episodeStatus: string | null | undefined,
  storyStatus: string | null | undefined,
  storyVisibility: string | null | undefined
) {
  return (
    publicContentStatuses.includes(episodeStatus as PublicContentStatus) &&
    canViewPublicStory(storyStatus, storyVisibility)
  );
}

export function canViewCommunityPost(
  status: string | null | undefined,
  isOwner = false,
  isAdminOrModerator = false
) {
  return status === "approved" || isOwner || isAdminOrModerator;
}
