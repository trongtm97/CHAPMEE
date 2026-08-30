import {
  loadCurrentStoryImagesByStoryIds,
  resolveStoryImageUrl
} from "@/lib/images/get-current-story-image";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import type { DatabaseClient } from "@/lib/db/types";

/** Export cover_url as public media URL (media.chapmee.com), not raw external links. */
export async function resolveStoryCoverUrlsForExport(
  db: DatabaseClient,
  stories: Array<{ id: string; cover_url?: string | null }>
): Promise<Map<string, string>> {
  const storyIds = stories.map((story) => String(story.id));
  const images = await loadCurrentStoryImagesByStoryIds(db, storyIds);
  const resolved = new Map<string, string>();

  for (const story of stories) {
    const storyId = String(story.id);
    const image = images.get(storyId) ?? null;
    const url =
      resolveStoryImageUrl({
        coverUrl: resolveStoryCoverUrl(story.cover_url),
        image,
        variant: "portrait"
      }) ?? resolveStoryCoverUrl(story.cover_url);

    if (url) {
      resolved.set(storyId, url);
    }
  }

  return resolved;
}
