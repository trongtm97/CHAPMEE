"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import { registerStorageAsset, unlinkStorageAssetFromEntity } from "@/lib/storage/asset-service";

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

  return { buffer, extension, mimeType };
}

export async function uploadAvatarAction(dataUrl: string): Promise<UploadAvatarResult> {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return { error: "Định dạng ảnh không được hỗ trợ.", avatarUrl: null };
  }

  if (parsed.buffer.byteLength > MAX_BYTES) {
    return { error: "Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.", avatarUrl: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/me/settings");
  }

  const filePath = `${user.id}/avatar-${Date.now()}.${parsed.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, parsed.buffer, {
      cacheControl: "3600",
      contentType: parsed.mimeType,
      upsert: true
    });

  if (uploadError) {
    return {
      error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
      avatarUrl: null
    };
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const avatarUrl = publicData.publicUrl;
  await registerStorageAsset(supabase, {
    bucket: "avatars",
    isOriginal: true,
    isPublic: true,
    linkedEntityId: user.id,
    linkedEntityType: "profile",
    linkedField: "avatar_url",
    metadata: { module: "avatar" },
    mimeType: parsed.mimeType,
    ownerId: user.id,
    path: filePath,
    publicUrl: avatarUrl,
    sizeBytes: parsed.buffer.byteLength,
    extension: parsed.extension,
    usageType: "avatar"
  });

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
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

  return { error: null, avatarUrl };
}

export async function clearAvatarAction(): Promise<UploadAvatarResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/studio/settings");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)
    .select("username")
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message, avatarUrl: null };
  }

  if (currentProfile?.avatar_url) {
    await unlinkStorageAssetFromEntity(supabase, {
      entityId: user.id,
      entityType: "profile",
      field: "avatar_url",
      publicUrl: currentProfile.avatar_url
    });
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  revalidatePath("/studio/settings");
  revalidatePublicProfilePaths(profileRow?.username, { userId: user.id });

  return { error: null, avatarUrl: null };
}
