import { randomUUID } from "crypto";
import { buildMediaObjectKey } from "@/lib/storage/media-paths";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import { getMediaS3Bucket } from "@/lib/storage/s3";
import type { DatabaseClient } from "@/lib/db/types";

export function buildChapterImageObjectKeys(filename: string) {
  const imageKey = buildMediaObjectKey("chapter-media", filename);
  const thumbKey = imageKey.replace(/\.([a-z0-9]+)$/i, "-thumb.$1");
  return { imageKey, thumbKey };
}

export async function uploadChapterImageVariant(
  db: DatabaseClient,
  objectKey: string,
  buffer: Buffer,
  input?: {
    linkedEntityId?: string;
    linkedEntityType?: string;
    linkedField?: string;
  }
) {
  const bucket = getMediaS3Bucket();
  const { error } = await db.storage.from(bucket).upload(objectKey, buffer, {
    cacheControl: "31536000",
    contentType: "image/webp",
    upsert: true
  });

  if (error) {
    throw new Error(error.message);
  }

  await registerStorageAsset(db, {
    bucket,
    isOriginal: !objectKey.includes("-thumb."),
    isPublic: true,
    linkedEntityId: input?.linkedEntityId,
    linkedEntityType: input?.linkedEntityType ?? "chapter_image",
    linkedField: input?.linkedField ?? (objectKey.includes("-thumb.") ? "thumb" : "image"),
    metadata: { module: "chapter_image" },
    mimeType: "image/webp",
    path: objectKey,
    sizeBytes: buffer.byteLength,
    extension: "webp",
    usageType: "chapter_image"
  });

  return objectKey;
}

export async function removeChapterImageObjects(
  db: DatabaseClient,
  imageKey: string,
  thumbKey: string
) {
  const bucket = getMediaS3Bucket();
  await db.storage.from(bucket).remove([imageKey, thumbKey]);
}

/** @deprecated Legacy prefix helper — new uploads use chapter-media/yyyy/mm/dd keys. */
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

export function getChapterImageStoragePath(prefix: string, variant: "image" | "thumb") {
  return `${prefix}/${variant}.webp`;
}

export function newChapterImageId() {
  return randomUUID();
}
