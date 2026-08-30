import { CHAPTER_IMAGE_MAX_PER_CHAPTER } from "@/types/chapter-images";
import { countImageBlocksInContent } from "@/lib/editor/chapter-image-block";
import type { DatabaseClient } from "@/lib/db/types";

export async function countChapterImagesForScope(
  db: DatabaseClient,
  input: {
    storyId: string;
    episodeId?: string | null;
    draftId?: string | null;
    contentImageCount?: number;
  }
) {
  let query = db
    .from("chapter_images")
    .select("id", { count: "exact", head: true })
    .eq("story_id", input.storyId);

  if (input.episodeId) {
    query = query.eq("episode_id", input.episodeId);
  } else if (input.draftId) {
    query = query.eq("draft_id", input.draftId);
  } else {
    return input.contentImageCount ?? 0;
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const dbCount = count ?? 0;
  const contentCount = input.contentImageCount ?? 0;

  return Math.max(dbCount, contentCount);
}

export async function assertChapterImageLimit(
  db: DatabaseClient,
  input: {
    storyId: string;
    episodeId?: string | null;
    draftId?: string | null;
    content?: string;
  }
) {
  const contentImageCount = input.content
    ? countImageBlocksInContent(input.content)
    : 0;

  if (contentImageCount >= CHAPTER_IMAGE_MAX_PER_CHAPTER) {
    return false;
  }

  const dbCount = await countChapterImagesForScope(db, {
    draftId: input.draftId,
    episodeId: input.episodeId,
    storyId: input.storyId
  });

  return dbCount < CHAPTER_IMAGE_MAX_PER_CHAPTER;
}
