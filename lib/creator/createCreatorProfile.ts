"use server";

import { redirect } from "next/navigation";
import { validateDisplayName } from "@/lib/username/validate-display-name";
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
  const penName = String(formData.get("pen_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!penName) {
    return { error: "Vui lòng nhập bút danh tác giả.", success: false };
  }

  if (penName.length > 80) {
    return { error: "Bút danh tối đa 80 ký tự.", success: false };
  }

  if (bio.length > 500) {
    return { error: "Bio tối đa 500 ký tự.", success: false };
  }

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

  const penNamePolicy = await validateDisplayName(penName, user.id);
  if (!penNamePolicy.valid) {
    return { error: penNamePolicy.message ?? "Bút danh không hợp lệ.", success: false };
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

  const { error: insertError } = await supabase
    .from("creator_profiles")
    .insert({
      user_id: user.id,
      pen_name: penName,
      bio: bio || null,
      status: "active"
    });

  if (insertError) {
    if (insertError.code === "23505") {
      redirect("/studio");
    }

    return { error: insertError.message, success: false };
  }

  await awardBadge({
    userId: user.id,
    badgeKey: "author_new",
    metadata: {
      pen_name: penName
    }
  });

  redirect("/studio");
}
