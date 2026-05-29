import { mapStoryImageRow } from "@/lib/images/map-story-image";
import { STORY_IMAGE_SELECT_COLUMNS } from "@/lib/images/get-current-story-image";
import { STORY_IMAGE_STORAGE_BUCKET } from "@/types/story-images";
import type { StoryImage, StoryImageRow } from "@/types/story-images";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SaveStoryImageRecordInput = {
  storyId: string;
  imageId: string;
  urls: {
    original: string;
    portrait: string;
    landscape: string;
    square: string;
    thumb: string;
    blur: string;
  };
  width: number;
  height: number;
  originalFileSizeBytes: number;
  processedFileSizeBytes: number;
  focalX?: number;
  focalY?: number;
};

export type SaveStoryImageRecordResult = {
  image: StoryImage | null;
  error: string | null;
};

/**
 * Inserts a new current story_images row (trigger clears previous current).
 * Syncs stories.cover_url for backward compatibility with legacy UI.
 */
export async function saveStoryImageRecord(
  supabase: SupabaseClient,
  input: SaveStoryImageRecordInput
): Promise<SaveStoryImageRecordResult> {
  const { data, error } = await supabase
    .from("story_images")
    .insert({
      id: input.imageId,
      story_id: input.storyId,
      original_url: input.urls.original,
      portrait_url: input.urls.portrait,
      landscape_url: input.urls.landscape,
      square_url: input.urls.square,
      thumb_url: input.urls.thumb,
      blur_url: input.urls.blur,
      original_width: input.width,
      original_height: input.height,
      original_file_size_bytes: input.originalFileSizeBytes,
      processed_file_size_bytes: input.processedFileSizeBytes,
      mime_type: "image/webp",
      storage_bucket: STORY_IMAGE_STORAGE_BUCKET,
      focal_x: input.focalX ?? 0.5,
      focal_y: input.focalY ?? 0.5,
      is_current: true
    })
    .select(STORY_IMAGE_SELECT_COLUMNS)
    .single();

  if (error) {
    return { image: null, error: error.message };
  }

  const { error: coverError } = await supabase
    .from("stories")
    .update({ cover_url: input.urls.portrait })
    .eq("id", input.storyId);

  if (coverError) {
    return { image: mapStoryImageRow(data as StoryImageRow), error: coverError.message };
  }

  return {
    image: mapStoryImageRow(data as StoryImageRow),
    error: null
  };
}
