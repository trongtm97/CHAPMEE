"use server";

import { redirect } from "next/navigation";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { suggestDefaultUsername } from "@/lib/username/suggest-default-username";
import { awardBadge } from "@/lib/supabase/badges";
import { createClient } from "@/lib/supabase/server";

export type CreatorSetupState = {
  error: string | null;
  success: boolean;
};

export async function createCreatorProfileAction(
  _previousState: CreatorSetupState,
  formData: FormData
): Promise<CreatorSetupState> {
  const displayNameInput = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    return { error: userError.message, success: false };
  }

  if (!user) {
    redirect("/login?next=/studio/setup");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, bio")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = displayNameInput || profile?.display_name?.trim() || "";

  if (!displayName) {
    return {
      error: "Vui lòng nhập tên hiển thị hoặc cập nhật hồ sơ trước khi bật quyền viết truyện.",
      success: false
    };
  }

  if (displayName.length > 80) {
    return { error: "Tên hiển thị tối đa 80 ký tự.", success: false };
  }

  const bioValue = bio || profile?.bio?.trim() || "";
  if (bioValue.length > 500) {
    return { error: "Giới thiệu tối đa 500 ký tự.", success: false };
  }

  const displayNamePolicy = await validateDisplayName(displayName, user.id);
  if (!displayNamePolicy.valid) {
    return { error: displayNamePolicy.message ?? "Tên hiển thị không hợp lệ.", success: false };
  }

  const { data: existingProfile, error: existingError } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message, success: false };
  }

  if (existingProfile) {
    redirect("/studio");
  }

  let username = profile?.username?.trim() || null;
  if (!username) {
    username = await suggestDefaultUsername(displayName, user.id);
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      bio: bioValue || null,
      display_name: displayName,
      ...(username ? { username } : {})
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    return { error: profileUpdateError.message, success: false };
  }

  const { error: insertError } = await supabase.from("creator_profiles").insert({
    bio: bioValue || null,
    pen_name: displayName,
    status: "active",
    user_id: user.id
  });

  if (insertError) {
    if (insertError.code === "23505") {
      redirect("/studio");
    }

    return { error: insertError.message, success: false };
  }

  await awardBadge({
    metadata: {
      display_name: displayName
    },
    userId: user.id,
    badgeKey: "author_new"
  });

  redirect("/studio");
}
