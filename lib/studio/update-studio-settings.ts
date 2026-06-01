"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { validateUsername } from "@/lib/profile/buildProfileHandle";
import { validateStudioSettingsForm } from "@/lib/studio/settings-validation";
import { ensureProfileUsername } from "@/lib/profile/ensure-profile-username";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { validateUsername as validateUsernamePolicy } from "@/lib/username/validate-username";
import { recordUsernameChange } from "@/lib/username/record-username-change";
import { createClient } from "@/lib/supabase/server";
import { revalidatePublicProfilePaths } from "@/lib/profile/revalidate-public-profile";
import type { StudioSettingsFormValues, StudioSettingsSaveResult } from "@/types/studio-settings";

export async function updateStudioSettingsAction(
  values: StudioSettingsFormValues
): Promise<StudioSettingsSaveResult> {
  const validation = validateStudioSettingsForm(values);
  if (!validation.ok) {
    return {
      error: validation.error,
      fieldErrors: validation.fieldErrors,
      success: false
    };
  }

  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect("/login?next=/studio/settings");
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  const displayName = values.displayName.trim();
  const bio = values.bio.trim() || null;
  const usernameRaw = values.username.trim();

  const displayNamePolicy = await validateDisplayName(displayName, user.id);
  if (!displayNamePolicy.valid) {
    return {
      error: displayNamePolicy.message ?? "Tên hiển thị không hợp lệ.",
      fieldErrors: { displayName: displayNamePolicy.message ?? "Tên hiển thị không hợp lệ." },
      success: false
    };
  }

  let normalizedUsername: string | null = null;

  if (usernameRaw) {
    const formatCheck = validateUsername(usernameRaw);
    if (formatCheck.error) {
      return {
        error: formatCheck.error,
        fieldErrors: { username: formatCheck.error },
        success: false
      };
    }

    const policyCheck = await validateUsernamePolicy(usernameRaw, user.id);
    if (!policyCheck.valid) {
      const message =
        policyCheck.error_code === "taken"
          ? "Username đã được sử dụng."
          : policyCheck.message ?? "Username không hợp lệ.";
      return {
        error: message,
        fieldErrors: { username: message },
        success: false
      };
    }

    normalizedUsername = policyCheck.normalized;
  } else {
    normalizedUsername = await ensureProfileUsername(user.id, displayName);
    if (!normalizedUsername) {
      return {
        error: "Không thể tạo username từ tên hiển thị. Vui lòng nhập username thủ công.",
        fieldErrors: {
          username: "Tên hiển thị quá ngắn hoặc username gợi ý không khả dụng."
        },
        success: false
      };
    }
  }

  const supabase = await createClient();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      bio,
      display_name: displayName,
      username: normalizedUsername
    })
    .eq("id", user.id);

  if (profileError) {
    if (profileError.code === "23505") {
      return {
        error: "Username đã được sử dụng.",
        fieldErrors: { username: "Username đã được sử dụng." },
        success: false
      };
    }
    return { error: profileError.message, success: false };
  }

  if (normalizedUsername && currentProfile?.username !== normalizedUsername) {
    await recordUsernameChange({
      changeReason: "Đổi username từ Studio",
      changedBy: user.id,
      newUsername: normalizedUsername,
      oldUsername: currentProfile?.username ?? null,
      userId: user.id
    });
  }

  const p = values.privacy;

  await supabase.from("profile_privacy_settings").upsert({
    allow_dm: p.allowDm,
    allow_follow: p.allowFollow,
    show_badges: p.showBadges,
    show_creator_works: p.showCreatorWorks,
    show_followed_authors: p.showFollowedAuthors,
    show_followed_groups: p.showFollowedGroups,
    show_public_activities: p.showPublicActivities,
    show_public_collections: p.showPublicCollections,
    show_public_comments: p.showPublicComments,
    show_reading_history: p.showReadingHistory,
    show_saved_stories: p.showSavedStories,
    updated_at: new Date().toISOString(),
    user_id: user.id
  });

  await supabase
    .from("message_privacy_settings")
    .update({
      allow_message_requests: p.allowDm,
      updated_at: new Date().toISOString(),
      who_can_message: p.allowDm ? "followers_only" : "no_one"
    })
    .eq("user_id", user.id);

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  revalidatePath("/me");
  revalidatePath(`/creators/${creatorProfile.id}`);
  revalidatePublicProfilePaths(normalizedUsername);
  if (
    currentProfile?.username &&
    currentProfile.username !== normalizedUsername
  ) {
    revalidatePublicProfilePaths(currentProfile.username);
    revalidatePath(`/profile/${currentProfile.username}`);
  }
  if (normalizedUsername) {
    revalidatePath(`/profile/${normalizedUsername}`);
  }

  return { error: null, success: true };
}

export async function checkUsernameAvailabilityAction(
  username: string
): Promise<{ available: boolean; message: string | null; status: "valid" | "invalid" | "taken" }> {
  const { user } = await getCurrentCreatorProfile();
  const trimmed = username.trim();

  if (!trimmed) {
    return { available: false, message: "Nhập username để kiểm tra.", status: "invalid" };
  }

  const formatCheck = validateUsername(trimmed);
  if (formatCheck.error) {
    return { available: false, message: "Username không hợp lệ.", status: "invalid" };
  }

  const result = await validateUsernamePolicy(trimmed, user?.id ?? null);
  if (result.valid) {
    return { available: true, message: "Username có thể dùng.", status: "valid" };
  }

  if (result.error_code === "taken") {
    return { available: false, message: "Username đã được sử dụng.", status: "taken" };
  }

  return {
    available: false,
    message: result.message ?? "Username không hợp lệ.",
    status: "invalid"
  };
}
