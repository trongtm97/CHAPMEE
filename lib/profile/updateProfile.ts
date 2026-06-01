"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildProfileHandle, validateBio, validateUsername } from "@/lib/profile/buildProfileHandle";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { validateUsername as validateUsernamePolicy } from "@/lib/username/validate-username";
import { ensureProfileUsername } from "@/lib/profile/ensure-profile-username";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import { recordUsernameChange } from "@/lib/username/record-username-change";

export type UpdateProfileActionState = {
  error: string | null;
  success: boolean;
  savedAt?: number;
};

export async function updateProfileAction(
  _previousState: UpdateProfileActionState,
  formData: FormData
): Promise<UpdateProfileActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim();
  const bioRaw = String(formData.get("bio") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/me/settings");
  }

  const displayResult = await validateDisplayName(displayName, user.id);
  if (!displayResult.valid) {
    return { error: displayResult.message ?? "Tên hiển thị không hợp lệ.", success: false };
  }

  const { bio, error: bioError } = validateBio(bioRaw);
  if (bioError) {
    return { error: bioError, success: false };
  }

  const { error: formatUsernameError } = validateUsername(usernameRaw);
  if (formatUsernameError) {
    return { error: formatUsernameError, success: false };
  }

  let username: string | null = null;

  if (usernameRaw) {
    const usernameResult = await validateUsernamePolicy(usernameRaw, user.id);
    if (!usernameResult.valid) {
      return {
        error: usernameResult.message ?? "Username không hợp lệ.",
        success: false
      };
    }
    username = usernameResult.normalized;
  } else {
    username = await ensureProfileUsername(user.id, displayResult.normalized);
  }

  const { assertNotBanned } = await import("@/lib/auth/require-not-banned");
  try {
    await assertNotBanned(user.id);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Tài khoản của bạn đang bị hạn chế.",
      success: false
    };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: displayResult.normalized,
      username: username || null,
      bio
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Không thể lưu hồ sơ. Vui lòng thử lại.", success: false };
  }

  if (username && currentProfile?.username !== username) {
    await recordUsernameChange({
      userId: user.id,
      oldUsername: currentProfile?.username ?? null,
      newUsername: username,
      changedBy: user.id,
      changeReason: "User đổi username"
    });
  }

  revalidatePath("/me");
  revalidatePath("/me/settings");
  revalidatePublicProfilePaths(username, { userId: user.id });
  if (currentProfile?.username && currentProfile.username !== username) {
    revalidatePublicProfilePaths(currentProfile.username);
  }

  return { error: null, success: true, savedAt: Date.now() };
}

export async function getProfileSettingsData() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.display_name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    avatarUrl: profile.avatar_url,
    handle: buildProfileHandle({
      username: profile.username,
      displayName: profile.display_name,
      userId: user.id
    })
  };
}
