"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioDraftVersions } from "@/lib/studio/get-draft-versions";
import { restoreStudioDraftVersion } from "@/lib/studio/restore-draft-version";
import { saveStudioDraft, type SaveStudioDraftInput } from "@/lib/studio/save-draft";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/data/server";

async function getProfileId() {
  const { profile, user } = await getCurrentUser();

  if (!user?.id) {
    return { error: "Bạn cần đăng nhập.", profileId: null };
  }

  if (profile?.id) {
    return { error: null, profileId: profile.id };
  }

  const db = await createClient();
  const { data: loaded, error } = await db
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
    const db = await createClient();
    const { error: deleteError } = await db
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

export async function bulkDeleteStudioDraftsAction(draftIds: string[]) {
  const { error, profileId } = await getProfileId();

  if (!profileId) {
    return { error, failedCount: draftIds.length, ok: false as const, successCount: 0 };
  }

  if (draftIds.length === 0) {
    return { error: "Chưa chọn nháp nào.", failedCount: 0, ok: false as const, successCount: 0 };
  }

  try {
    const db = await createClient();
    const { error: deleteError, count } = await db
      .from("creator_drafts")
      .delete({ count: "exact" })
      .eq("owner_id", profileId)
      .in("id", draftIds);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath(studioPath("/drafts"));

    const successCount = count ?? draftIds.length;
    const failedCount = Math.max(0, draftIds.length - successCount);

    return {
      error: failedCount > 0 ? "Một số nháp không xóa được." : undefined,
      failedCount,
      ok: successCount > 0,
      successCount
    };
  } catch (deleteFailure) {
    return {
      error:
        deleteFailure instanceof Error
          ? deleteFailure.message
          : "Không thể xóa nháp.",
      failedCount: draftIds.length,
      ok: false as const,
      successCount: 0
    };
  }
}
