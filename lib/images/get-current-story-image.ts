import { mapStoryImageRow } from "@/lib/images/map-story-image";
import type { DatabaseClient } from "@/lib/db/types";
import { getStoryImageSrc } from "@/lib/images/get-story-image";
import { resolveStoryCoverUrl } from "@/lib/stories/resolve-story-cover-url";
import { buildStoryCoverVariantKey } from "@/lib/storage/media-paths";
import type { StoryImage, StoryImageRow, StoryImageVariant } from "@/types/story-images";

export const STORY_IMAGE_SELECT_COLUMNS =
  "id, story_id, original_url, portrait_url, landscape_url, square_url, thumb_url, blur_url, focal_x, focal_y, original_width, original_height, original_file_size_bytes, processed_file_size_bytes, mime_type, storage_bucket, is_current, created_at, updated_at";

export type ResolveStoryImageUrlInput = {
  image?: StoryImage | null;
  variant: StoryImageVariant;
  coverUrl?: string | null;
};

/**
 * Preferred variant URL from current story_images row, then legacy stories.cover_url.
 */
export function resolveStoryImageUrl({
  coverUrl,
  image,
  variant
}: ResolveStoryImageUrlInput): string | null {
  return getStoryImageSrc(
    {
      title: "",
      coverUrl: resolveStoryCoverUrl(coverUrl),
      currentImage: image ?? null
    },
    variant
  );
}

export async function loadCurrentStoryImagesByStoryIds(
  db: DatabaseClient,
  storyIds: string[]
): Promise<Map<string, StoryImage>> {
  const uniqueIds = [...new Set(storyIds.filter(Boolean))];
  const map = new Map<string, StoryImage>();
  if (uniqueIds.length === 0) {
    return map;
  }

  const chunkSize = 200;
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data, error } = await db
      .from("story_images")
      .select(STORY_IMAGE_SELECT_COLUMNS)
      .in("story_id", chunk)
      .eq("is_current", true);

    if (error) {
      console.error("[story_images] batch load failed", error);
      continue;
    }

    for (const row of data ?? []) {
      const image = mapStoryImageRow(row as StoryImageRow);
      map.set(image.storyId, image);
    }
  }

  return map;
}

export async function getCurrentStoryImage(
  db: DatabaseClient,
  storyId: string
): Promise<{ image: StoryImage | null; error: string | null }> {
  const { data, error } = await db
    .from("story_images")
    .select(STORY_IMAGE_SELECT_COLUMNS)
    .eq("story_id", storyId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    return {
      image: null,
      error: error.message
    };
  }

  if (!data) {
    return { image: null, error: null };
  }

  return {
    image: mapStoryImageRow(data as StoryImageRow),
    error: null
  };
}

export function getStoryImageStorageObjectPath(
  _storyId: string,
  imageId: string,
  variant: StoryImageVariant
) {
  return buildStoryCoverVariantKey(imageId, variant);
}
