import { canViewPublicEpisode, canViewPublicStory } from "@/lib/visibility/contentVisibility";

export function shouldIndexStory(input: {
  status?: string | null;
  visibility?: string | null;
}) {
  return canViewPublicStory(input.status, input.visibility);
}

export function shouldIndexEpisode(input: {
  episodeStatus?: string | null;
  storyStatus?: string | null;
  storyVisibility?: string | null;
}) {
  return canViewPublicEpisode(
    input.episodeStatus,
    input.storyStatus,
    input.storyVisibility
  );
}

export const STUDIO_NOINDEX_ROBOTS = {
  follow: false,
  index: false
} as const;
