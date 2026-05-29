import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import { STORY_IMAGE_STORAGE_BUCKET } from "@/types/story-images";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadStoryImageOriginalResult = {
  path: string;
  publicUrl: string;
};

export async function uploadStoryImageOriginal(
  supabase: SupabaseClient,
  storyId: string,
  imageId: string,
  buffer: Buffer
): Promise<UploadStoryImageOriginalResult> {
  const path = getStoryImageStorageObjectPath(storyId, imageId, "original");

  const { error } = await supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(STORY_IMAGE_STORAGE_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl
  };
}
