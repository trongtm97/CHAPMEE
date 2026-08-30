"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { createClient } from "@/lib/data/server";

export type CreatorProfileSettingsActionState = {
  error: string | null;
  success: boolean;
};

function parseAvatarUrl(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  return raw ? raw : null;
}

/** @deprecated Use updateStudioSettingsAction — kept for legacy forms. */
export async function updateCreatorProfileAction(
  _previousState: CreatorProfileSettingsActionState,
  formData: FormData
): Promise<CreatorProfileSettingsActionState> {
  const displayName = String(formData.get("display_name") ?? formData.get("pen_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = parseAvatarUrl(formData.get("avatar_url"));
  if (avatarUrl) {
    return {
      error: "Ảnh đại diện phải upload qua trình upload avatar, không dán URL.",
      success: false
    };
  }

  if (!displayName) {
    return { error: "Vui lòng nhập tên hiển thị.", success: false };
  }

  if (displayName.length > 80) {
    return { error: "Tên hiển thị tối đa 80 ký tự.", success: false };
  }

  if (bio.length > 500) {
    return { error: "Giới thiệu tối đa 500 ký tự.", success: false };
  }

  const { creatorProfile, user } = await requireCreatorProfile("/studio/settings");

  const displayNamePolicy = await validateDisplayName(displayName, user.id);
  if (!displayNamePolicy.valid) {
    return { error: displayNamePolicy.message ?? "Tên hiển thị không hợp lệ.", success: false };
  }

  const db = await createClient();

  const { error: profileError } = await db
    .from("profiles")
    .update({
      bio: bio || null,
      display_name: displayName
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message, success: false };
  }

  revalidatePath("/studio/settings");
  revalidatePath("/studio");

  return { error: null, success: true };
}
