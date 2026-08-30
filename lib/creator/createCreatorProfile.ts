"use server";

import { redirect } from "next/navigation";
import { ensureCreatorProfile } from "@/lib/creator/ensure-creator-profile";
import { createClient } from "@/lib/data/server";

export type CreatorSetupState = {
  error: string | null;
  success: boolean;
};

/** @deprecated Setup UI removed — auto-provisions creator profile. */
export async function createCreatorProfileAction(
  _previousState: CreatorSetupState,
  formData: FormData
): Promise<CreatorSetupState> {
  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError) {
    return { error: userError.message, success: false };
  }

  if (!user) {
    redirect("/login?next=/studio");
  }

  const displayNameInput = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (displayNameInput || bio) {
    const { data: profile } = await db
      .from("profiles")
      .select("display_name, bio")
      .eq("id", user.id)
      .maybeSingle();

    await db
      .from("profiles")
      .update({
        display_name: displayNameInput || profile?.display_name || undefined,
        bio: bio || profile?.bio || null
      })
      .eq("id", user.id);
  }

  const created = await ensureCreatorProfile(user.id);
  if (!created) {
    return {
      error: "Không thể bật quyền viết truyện. Vui lòng thử lại sau.",
      success: false
    };
  }

  redirect("/studio");
}
