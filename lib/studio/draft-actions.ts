"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioDraftVersions } from "@/lib/studio/get-draft-versions";
import { restoreStudioDraftVersion } from "@/lib/studio/restore-draft-version";
import { saveStudioDraft, type SaveStudioDraftInput } from "@/lib/studio/save-draft";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";

async function getProfileId() {
  const { profile, user } = await getCurrentUser();

  if (!user?.id) {
    return { error: "Bạn cần đăng nhập.", profileId: null };
  }

  if (profile?.id) {
    return { error: null, profileId: profile.id };
  }

  const supabase = await createClient();
  const { data: loaded, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !loaded?.id) {
    return { error: "Không tìm thấy hồ sơ.", profileId: null };
  }

  return { error: null, profileId: loaded.id as string };
}

export async function autosaveStudioDraftAction(
  input: Omit<SaveStudioDraftInput, "profileId">
) {
  const { error, profileId } = await getProfileId();

  if (!profileId) {
    return { error, ok: false as const };
  }

  const result = await saveStudioDraft({
    ...input,
    createVersion: input.createVersion ?? false,
    profileId
  });

  if (result.ok) {
    revalidatePath(studioPath("/drafts"));
  }

  return result;
}

export async function listStudioDraftVersionsAction(draftId: string) {
  const { error, profileId } = await getProfileId();

  if (!profileId) {
    return { error, versions: [] };
  }

  return getStudioDraftVersions(profileId, draftId);
}

export async function restoreStudioDraftVersionAction(
  draftId: string,
  versionId: string
) {
  const { error, profileId } = await getProfileId();

  if (!profileId) {
    return { error, ok: false as const };
  }

  const result = await restoreStudioDraftVersion(profileId, draftId, versionId);

  if (result.ok) {
    revalidatePath(studioPath("/drafts"));
  }

  return result;
}

export async function deleteStudioDraftAction(draftId: string) {
  const { error, profileId } = await getProfileId();

  if (!profileId) {
    return { error, ok: false as const };
  }

  try {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("creator_drafts")
      .delete()
      .eq("id", draftId)
      .eq("owner_id", profileId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath(studioPath("/drafts"));
    return { ok: true as const };
  } catch (deleteFailure) {
    return {
      error:
        deleteFailure instanceof Error
          ? deleteFailure.message
          : "Không thể xóa nháp.",
      ok: false as const
    };
  }
}
