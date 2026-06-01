"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registerStorageAsset } from "@/lib/storage/asset-service";
import type { ContentPostCoverUploadResult } from "@/types/admin-content-posts";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "content-posts";

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

export async function uploadContentPostCoverAction(
  dataUrl: string
): Promise<ContentPostCoverUploadResult> {
  const { checkStaffAnyPermission } = await import("@/lib/auth/staff-guards");
  const staff = await checkStaffAnyPermission(["content.post.create", "content.post.update"]);

  if (!staff.ok) {
    return { ok: false, message: staff.error, url: null };
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return {
      ok: false,
      message: "Ảnh không hợp lệ. Chọn JPG, PNG hoặc WebP dưới 5MB.",
      url: null
    };
  }

  const supabase = await createClient();
  const filePath = `covers/${staff.userId}/${Date.now()}.${parsed.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, parsed.buffer, {
      cacheControl: "3600",
      contentType: parsed.mimeType,
      upsert: false
    });

  if (uploadError) {
    return {
      ok: false,
      message: "Không thể tải ảnh lên. Vui lòng thử lại.",
      url: null
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  await registerStorageAsset(supabase, {
    bucket: BUCKET,
    isOriginal: true,
    isPublic: true,
    linkedEntityType: "content_post",
    linkedField: "cover_url",
    metadata: { module: "content_post_cover" },
    mimeType: parsed.mimeType,
    ownerId: staff.userId,
    path: filePath,
    publicUrl: data.publicUrl,
    sizeBytes: parsed.buffer.byteLength,
    extension: parsed.extension,
    usageType: "content_post_cover"
  });

  return {
    ok: true,
    message: null,
    url: data.publicUrl
  };
}

export async function requireContentPostAdmin() {
  const { requireAnyPermission } = await import("@/lib/auth/require-permission");
  const guard = await requireAnyPermission(
    ["content.post.view", "admin.dashboard.view"],
    { returnTo: "/admin/content-hub" }
  );

  if (!guard.ok) {
    redirect("/admin");
  }

  return guard.context;
}
