import { CHAPTER_IMAGE_STORAGE_BUCKET } from "@/types/chapter-images";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getChapterImageStoragePrefix(input: {
  storyId: string;
  imageId: string;
  episodeId?: string | null;
  draftId?: string | null;
}) {
  if (input.episodeId) {
    return `${input.storyId}/${input.episodeId}/${input.imageId}`;
  }

  if (input.draftId) {
    return `${input.storyId}/drafts/${input.draftId}/${input.imageId}`;
  }

  throw new Error("Thiếu phạm vi chương cho ảnh.");
}

export function getChapterImageStoragePath(
  prefix: string,
  variant: "image" | "thumb"
) {
  return `${prefix}/${variant}.webp`;
}

export async function uploadChapterImageVariant(
  supabase: SupabaseClient,
  path: string,
  buffer: Buffer
) {
  const { error } = await supabase.storage
    .from(CHAPTER_IMAGE_STORAGE_BUCKET)
    .upload(path, buffer, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage
    .from(CHAPTER_IMAGE_STORAGE_BUCKET)
    .getPublicUrl(path);
  await registerStorageAsset(supabase, {
    bucket: CHAPTER_IMAGE_STORAGE_BUCKET,
    isOriginal: path.endsWith("/image.webp"),
    isPublic: true,
    linkedEntityType: "chapter_image",
    linkedField: path.endsWith("/thumb.webp") ? "thumb" : "image",
    metadata: { module: "chapter_image" },
    mimeType: "image/webp",
    path,
    publicUrl: data.publicUrl,
    sizeBytes: buffer.byteLength,
    extension: "webp",
    usageType: "chapter_image"
  });

  return data.publicUrl;
}

export async function removeChapterImageStorageFolder(
  supabase: SupabaseClient,
  prefix: string
) {
  const imagePath = getChapterImageStoragePath(prefix, "image");
  const thumbPath = getChapterImageStoragePath(prefix, "thumb");

  await supabase.storage.from(CHAPTER_IMAGE_STORAGE_BUCKET).remove([
    imagePath,
    thumbPath
  ]);
}
