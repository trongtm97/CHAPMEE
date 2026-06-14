"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/data/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import { resolveProfileAvatarUrl } from "@/lib/profile/resolve-profile-avatar";
import { registerStorageAsset, unlinkStorageAssetFromEntity } from "@/lib/storage/asset-service";
import { buildMediaObjectKey } from "@/lib/storage/media-paths";
import { getMediaS3Bucket } from "@/lib/storage/s3";

const MAX_BYTES = 5 * 1024 * 1024;

export type UploadAvatarResult = {
  error: string | null;
  avatarUrl: string | null;
};

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) {
    return null;
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

  return { buffer, extension, mimeType, filename: `avatar.${extension}` };
}

export async function uploadAvatarAction(dataUrl: string): Promise<UploadAvatarResult> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return { error: "Định dạng ảnh không được hỗ trợ.", avatarUrl: null };
  }

  if (parsed.buffer.byteLength > MAX_BYTES) {
    return { error: "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.", avatarUrl: null };
  }

  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/me/settings");
  }

  const objectKey = buildMediaObjectKey("avatars", parsed.filename);
  const bucket = getMediaS3Bucket();

  const { error: uploadError } = await db.storage.from(bucket).upload(objectKey, parsed.buffer, {
    cacheControl: "31536000",
    contentType: parsed.mimeType,
    upsert: true
  });

  if (uploadError) {
    return {
      error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      avatarUrl: null
    };
  }

  const { assetId } = await registerStorageAsset(db, {
    bucket,
    isOriginal: true,
    isPublic: true,
    linkedEntityId: user.id,
    linkedEntityType: "profile",
    linkedField: "avatar_media_id",
    metadata: { module: "avatar" },
    mimeType: parsed.mimeType,
    ownerId: user.id,
    path: objectKey,
    sizeBytes: parsed.buffer.byteLength,
    extension: parsed.extension,
    status: "active",
    usageType: "avatar"
  });

  const { data: profileRow, error: profileError } = await db
    .from("profiles")
    .update({
      avatar_url: objectKey,
      avatar_media_id: assetId
    })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, avatarUrl: null };
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  revalidatePath("/studio/settings");
  revalidatePublicProfilePaths(profileRow?.username, { userId: user.id });

  return {
    error: null,
    avatarUrl: resolveProfileAvatarUrl({ avatar_url: objectKey })
  };
}

export async function clearAvatarAction(): Promise<UploadAvatarResult> {
  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/studio/settings");
  }

  const { data: currentProfile } = await db
    .from("profiles")
    .select("avatar_url, avatar_media_id, default_avatar_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profileRow, error: profileError } = await db
    .from("profiles")
    .update({ avatar_url: null, avatar_media_id: null })
    .eq("id", user.id)
    .select("username, default_avatar_id")
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, avatarUrl: null };
  }

  if (currentProfile?.avatar_url) {
    await unlinkStorageAssetFromEntity(db, {
      entityId: user.id,
      entityType: "profile",
      field: "avatar_media_id",
      path: currentProfile.avatar_url
    });
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  revalidatePath("/studio/settings");
  revalidatePublicProfilePaths(profileRow?.username, { userId: user.id });

  return {
    error: null,
    avatarUrl: resolveProfileAvatarUrl({
      id: user.id,
      avatar_url: null,
      default_avatar_id: profileRow?.default_avatar_id ?? null
    })
  };
}
