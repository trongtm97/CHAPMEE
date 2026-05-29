import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/countWords";
import type { StudioDraftType } from "@/types/drafts";

const VERSION_INTERVAL_MS = 5 * 60 * 1000;
const SIGNIFICANT_WORD_DELTA = 50;

export type SaveStudioDraftInput = {
  profileId: string;
  draftType: StudioDraftType;
  storyId?: string | null;
  chapterId?: string | null;
  title?: string | null;
  content: Record<string, unknown>;
  plainText?: string | null;
  createVersion?: boolean;
  versionReason?: "manual" | "interval" | "restore_backup" | "publish";
};

export type SaveStudioDraftResult = {
  ok: boolean;
  draftId?: string;
  lastSavedAt?: string;
  error?: string;
};

type DraftRow = {
  id: string;
  last_saved_at: string;
  last_version_at: string | null;
  version_checkpoint_word_count: number | null;
};

function shouldCreateIntervalVersion(
  draft: DraftRow,
  wordCount: number,
  force: boolean
) {
  if (force) {
    return true;
  }

  const lastVersionAt = draft.last_version_at
    ? new Date(draft.last_version_at).getTime()
    : 0;
  const elapsed = Date.now() - lastVersionAt;

  if (elapsed < VERSION_INTERVAL_MS) {
    return false;
  }

  const checkpoint = draft.version_checkpoint_word_count ?? 0;
  return Math.abs(wordCount - checkpoint) >= SIGNIFICANT_WORD_DELTA;
}

async function insertDraftVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  draftId: string,
  profileId: string,
  title: string | null,
  content: Record<string, unknown>,
  plainText: string | null,
  wordCount: number
) {
  const { data: latest } = await supabase
    .from("creator_draft_versions")
    .select("version_number")
    .eq("draft_id", draftId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = ((latest?.version_number as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from("creator_draft_versions").insert({
    content,
    created_by: profileId,
    draft_id: draftId,
    plain_text: plainText,
    title,
    version_number: versionNumber,
    word_count: wordCount
  });

  if (error) {
    throw new Error(error.message);
  }

  return versionNumber;
}

export async function saveStudioDraft(
  input: SaveStudioDraftInput
): Promise<SaveStudioDraftResult> {
  try {
    const supabase = await createClient();
    const plainText = input.plainText ?? "";
    const wordCount = countWords(plainText);
    const now = new Date().toISOString();

    let existingQuery = supabase
      .from("creator_drafts")
      .select("id, last_saved_at, last_version_at, version_checkpoint_word_count")
      .eq("owner_id", input.profileId)
      .eq("draft_type", input.draftType);

    existingQuery = input.storyId
      ? existingQuery.eq("story_id", input.storyId)
      : existingQuery.is("story_id", null);

    existingQuery = input.chapterId
      ? existingQuery.eq("chapter_id", input.chapterId)
      : existingQuery.is("chapter_id", null);

    const { data: existing, error: fetchError } = await existingQuery.maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    let draftId = existing?.id as string | undefined;

    if (draftId) {
      const { error: updateError } = await supabase
        .from("creator_drafts")
        .update({
          content: input.content,
          last_saved_at: now,
          plain_text: plainText,
          status: "draft",
          title: input.title ?? null
        })
        .eq("id", draftId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("creator_drafts")
        .insert({
          chapter_id: input.chapterId ?? null,
          content: input.content,
          draft_type: input.draftType,
          last_saved_at: now,
          owner_id: input.profileId,
          plain_text: plainText,
          status: "draft",
          story_id: input.storyId ?? null,
          title: input.title ?? null
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      draftId = inserted.id as string;
    }

    const draftRow = (existing ?? {
      id: draftId,
      last_saved_at: now,
      last_version_at: null,
      version_checkpoint_word_count: null
    }) as DraftRow;

    const createVersion =
      input.createVersion ||
      shouldCreateIntervalVersion(draftRow, wordCount, false);

    if (createVersion && draftId) {
      await insertDraftVersion(
        supabase,
        draftId,
        input.profileId,
        input.title ?? null,
        input.content,
        plainText,
        wordCount
      );

      await supabase
        .from("creator_drafts")
        .update({
          last_version_at: now,
          version_checkpoint_word_count: wordCount
        })
        .eq("id", draftId);
    }

    return {
      draftId,
      lastSavedAt: now,
      ok: true
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể lưu nháp Studio.",
      ok: false
    };
  }
}
