import { studioPath } from "@/lib/studio/constants";

export function isStoryOwner(
  userId: string | null | undefined,
  creatorUserId: string | null | undefined
): boolean {
  return Boolean(userId && creatorUserId && userId === creatorUserId);
}

export function studioStoryEditHref(storyId: string) {
  return studioPath(`/stories/${storyId}/edit`);
}

export function studioStoryEpisodesHref(storyId: string) {
  return studioPath(`/stories/${storyId}/chapters`);
}

export function studioEpisodeEditHref(storyId: string, episodeId: string) {
  return studioPath(`/stories/${storyId}/chapters/${episodeId}/edit`);
}
