"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { validateDisplayName } from "@/lib/username/validate-display-name";
import { createClient } from "@/lib/supabase/server";

export type CreatorProfileSettingsActionState = {
  error: string | null;
  success: boolean;
};

function parseAvatarUrl(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();

  return raw ? raw : null;
}

export async function updateCreatorProfileAction(
  _previousState: CreatorProfileSettingsActionState,
  formData: FormData
): Promise<CreatorProfileSettingsActionState> {
  const penName = String(formData.get("pen_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const avatarUrl = parseAvatarUrl(formData.get("avatar_url"));

  if (!penName) {
    return { error: "Vui lòng nhập bút danh creator.", success: false };
  }

  if (penName.length > 80) {
    return { error: "Bút danh tối đa 80 ký tự.", success: false };
  }

  if (bio.length > 500) {
    return { error: "Bio tối đa 500 ký tự.", success: false };
  }

  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect("/login?next=/studio/settings");
  }

  if (!creatorProfile) {
    redirect("/creator/setup");
  }

  const penNamePolicy = await validateDisplayName(penName, user.id);
  if (!penNamePolicy.valid) {
    return { error: penNamePolicy.message ?? "Bút danh không hợp lệ.", success: false };
  }

  const supabase = await createClient();

  const { error: creatorError } = await supabase
    .from("creator_profiles")
    .update({
      bio: bio || null,
      pen_name: penName
    })
    .eq("id", creatorProfile.id)
    .eq("user_id", user.id);

  if (creatorError) {
    return { error: creatorError.message, success: false };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      bio: bio || null
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message, success: false };
  }

  revalidatePath("/studio/settings");
  revalidatePath("/studio");
  revalidatePath("/me");
  revalidatePath(`/me/${user.id}`);
  revalidatePath(`/creators/${creatorProfile.id}`);

  return { error: null, success: true };
}
