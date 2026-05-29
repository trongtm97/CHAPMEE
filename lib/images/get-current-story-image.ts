import { mapStoryImageRow } from "@/lib/images/map-story-image";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoryImageSrc } from "@/lib/images/get-story-image";
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
    { title: "", coverUrl, currentImage: image ?? null },
    variant
  );
}

export async function getCurrentStoryImage(
  supabase: SupabaseClient,
  storyId: string
): Promise<{ image: StoryImage | null; error: string | null }> {
  const { data, error } = await supabase
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
  storyId: string,
  imageId: string,
  variant: StoryImageVariant
) {
  return `${storyId}/${imageId}/${variant}.webp`;
}
