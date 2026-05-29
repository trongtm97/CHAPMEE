import { formatBlockingErrors } from "@/lib/publish/checklist-utils";
import { validateChapterBeforePublishFromDb } from "@/lib/publish/validate-chapter-before-publish";
import { validateStoryBeforePublishFromDb } from "@/lib/publish/validate-story-before-publish";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { SupabaseClient } from "@supabase/supabase-js";

/** @deprecated Dùng `PublishChecklistResult` từ `@/types/publish-checklist`. */
export type PublishValidationResult = PublishChecklistResult;

export async function validateStoryForPublish(
  supabase: SupabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishChecklistResult> {
  return validateStoryBeforePublishFromDb(supabase, storyId, creatorProfileId);
}

export async function validateChapterForPublish(
  supabase: SupabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: { episodeNumber?: number; requireFreshSave?: boolean; authorNote?: string | null }
): Promise<PublishChecklistResult> {
  return validateChapterBeforePublishFromDb(
    supabase,
    episodeId,
    storyId,
    creatorProfileId,
    {
      authorNote: options?.authorNote,
      episodeNumber: options?.episodeNumber
    }
  );
}

export function validationErrorMessage(result: PublishChecklistResult) {
  return formatBlockingErrors(result.rules);
}
