"use server";

import { createClient } from "@/lib/data/server";
import { resolveMediaObjectUrl } from "@/lib/media/media-resolver";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import { getMediaS3Bucket } from "@/lib/storage/s3";
import type { ContentPostCoverUploadResult } from "@/types/admin-content-posts";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  if (!ACCEPTED.has(mimeType) || buffer.byteLength > MAX_BYTES) {
    return null;
  }

  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return { buffer, extension, mimeType };
}

export async function uploadContentPostInlineImageAction(
  dataUrl: string
): Promise<ContentPostCoverUploadResult> {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffAnyPermission(["content.post.create", "content.post.update"]);

  if (!staff.ok) {
    return { ok: false, message: staff.error, mediaAssetId: null, objectKey: null, previewUrl: null };
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return {
      ok: false,
      message: "Ảnh không hợp lệ. Chọn JPG, PNG hoặc WebP dưới 5MB.",
      mediaAssetId: null,
      objectKey: null,
      previewUrl: null
    };
  }

  const db = await createClient();
  const bucket = getMediaS3Bucket();
  const objectKey = `content-posts/inline/${staff.userId}/${Date.now()}.${parsed.extension}`;

  const { error: uploadError } = await db.storage.from(bucket).upload(objectKey, parsed.buffer, {
    cacheControl: "31536000",
    contentType: parsed.mimeType,
    upsert: false
  });

  if (uploadError) {
    return {
      ok: false,
      message: "Không thể tải ảnh lên. Vui lòng thử lại.",
      mediaAssetId: null,
      objectKey: null,
      previewUrl: null
    };
  }

  const { assetId } = await registerStorageAsset(db, {
    bucket,
    isOriginal: true,
    isPublic: true,
    linkedEntityType: "content_post",
    linkedField: "content_inline_image",
    metadata: { module: "content_post_inline" },
    mimeType: parsed.mimeType,
    ownerId: staff.userId,
    path: objectKey,
    sizeBytes: parsed.buffer.byteLength,
    extension: parsed.extension,
    usageType: "content_post_inline",
    status: "active"
  });

  if (!assetId) {
    return {
      ok: false,
      message: "Không thể đăng ký media asset.",
      mediaAssetId: null,
      objectKey: null,
      previewUrl: null
    };
  }

  return {
    ok: true,
    message: null,
    mediaAssetId: assetId,
    objectKey,
    previewUrl: resolveMediaObjectUrl(objectKey)
  };
}
