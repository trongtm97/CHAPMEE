import { createClient } from "@/lib/data/server";
import { saveStudioDraft } from "@/lib/studio/save-draft";
import type { StudioDraftRecord } from "@/types/drafts";

export async function restoreStudioDraftVersion(
  profileId: string,
  draftId: string,
  versionId: string
): Promise<{ ok: boolean; draft?: StudioDraftRecord; error?: string }> {
  try {
    const db = await createClient();

    const { data: draft, error: draftError } = await db
      .from("creator_drafts")
      .select(
        "id, owner_id, story_id, chapter_id, draft_type, title, content, plain_text"
      )
      .eq("id", draftId)
      .eq("owner_id", profileId)
      .maybeSingle();

    if (draftError) {
      throw new Error(draftError.message);
    }

    if (!draft) {
      return { error: "Không tìm thấy nháp.", ok: false };
    }

    const { data: version, error: versionError } = await db
      .from("creator_draft_versions")
      .select("id, title, content, plain_text, word_count")
      .eq("id", versionId)
      .eq("draft_id", draftId)
      .maybeSingle();

    if (versionError) {
      throw new Error(versionError.message);
    }

    if (!version) {
      return { error: "Không tìm thấy phiên bản.", ok: false };
    }

    await saveStudioDraft({
      chapterId: draft.chapter_id as string | null,
      content: (draft.content as Record<string, unknown>) ?? {},
      createVersion: true,
      draftType: draft.draft_type,
      plainText: draft.plain_text as string | null,
      profileId,
      storyId: draft.story_id as string | null,
      title: draft.title as string | null,
      versionReason: "restore_backup"
    });

    const restoredContent = (version.content as Record<string, unknown>) ?? {};
    const restoredPlain =
      (version.plain_text as string | null) ??
      String(restoredContent.content ?? "");

    const saveResult = await saveStudioDraft({
      chapterId: draft.chapter_id as string | null,
      content: restoredContent,
      createVersion: true,
      draftType: draft.draft_type,
      plainText: restoredPlain,
      profileId,
      storyId: draft.story_id as string | null,
      title: (version.title as string | null) ?? (draft.title as string | null),
      versionReason: "manual"
    });

    if (!saveResult.ok) {
      return { error: saveResult.error, ok: false };
    }

    const { data: updated, error: reloadError } = await db
      .from("creator_drafts")
      .select(
        "id, owner_id, story_id, chapter_id, draft_type, title, content, plain_text, status, last_saved_at, created_at, updated_at"
      )
      .eq("id", draftId)
      .single();

    if (reloadError || !updated) {
      throw new Error(reloadError?.message ?? "Không tải lại được bản nháp.");
    }

    return {
      draft: {
        chapterId: updated.chapter_id as string | null,
        content: (updated.content as Record<string, unknown>) ?? {},
        createdAt: updated.created_at as string,
        draftType: updated.draft_type,
        id: updated.id as string,
        lastSavedAt: updated.last_saved_at as string,
        ownerId: updated.owner_id as string,
        plainText: updated.plain_text as string | null,
        status: updated.status,
        storyId: updated.story_id as string | null,
        title: updated.title as string | null,
        updatedAt: updated.updated_at as string
      },
      ok: true
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể khôi phục phiên bản.",
      ok: false
    };
  }
}
