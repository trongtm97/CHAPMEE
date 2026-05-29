"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message, avatarUrl: null };
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  revalidatePath(`/me/${user.id}`);

  return { error: null, avatarUrl };
}
