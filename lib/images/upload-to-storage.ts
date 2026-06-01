import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import { registerStorageAsset } from "@/lib/storage/asset-service";
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
  await registerStorageAsset(supabase, {
    bucket: STORY_IMAGE_STORAGE_BUCKET,
    isOriginal: true,
    isPublic: true,
    linkedEntityId: storyId,
    linkedEntityType: "story",
    linkedField: "story_image_original",
    metadata: { imageId, module: "story_cover" },
    mimeType: "image/webp",
    path,
    publicUrl: data.publicUrl,
    sizeBytes: buffer.byteLength,
    extension: "webp",
    usageType: "story_cover"
  });

  return {
    path,
    publicUrl: data.publicUrl
  };
}
