import { formatBlockingErrors } from "@/lib/publish/checklist-utils";
import { validateChapterBeforePublishFromDb } from "@/lib/publish/validate-chapter-before-publish.server";
import { validateStoryBeforePublishFromDb } from "@/lib/publish/validate-story-before-publish-server";
import type { PublishChecklistResult } from "@/types/publish-checklist";
import type { DatabaseClient } from "@/lib/db/types";

/** @deprecated Dùng `PublishChecklistResult` từ `@/types/publish-checklist`. */
export type PublishValidationResult = PublishChecklistResult;

export async function validateStoryForPublish(
  db: DatabaseClient,
  storyId: string,
  creatorProfileId: string
): Promise<PublishChecklistResult> {
  return validateStoryBeforePublishFromDb(db, storyId, creatorProfileId);
}

export async function validateChapterForPublish(
  db: DatabaseClient,
  episodeId: string,
  storyId: string,
  creatorProfileId: string,
  options?: { episodeNumber?: number; requireFreshSave?: boolean; authorNote?: string | null }
): Promise<PublishChecklistResult> {
  return validateChapterBeforePublishFromDb(
    db,
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
