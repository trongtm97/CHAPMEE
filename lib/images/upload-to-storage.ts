import { getStoryImageStorageObjectPath } from "@/lib/images/get-current-story-image";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import { getMediaS3Bucket } from "@/lib/storage/s3";
import type { DatabaseClient } from "@/lib/db/types";

export type UploadStoryImageOriginalResult = {
  path: string;
  publicUrl: string;
};

export async function uploadStoryImageOriginal(
  db: DatabaseClient,
  storyId: string,
  imageId: string,
  buffer: Buffer
): Promise<UploadStoryImageOriginalResult> {
  const path = getStoryImageStorageObjectPath(storyId, imageId, "original");

  const bucket = getMediaS3Bucket();
  const { error } = await db.storage.from(bucket).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  await registerStorageAsset(db, {
    bucket,
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
