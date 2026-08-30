import "server-only";

import type { DatabaseClient } from "@/lib/db/types";
import { persistEpisodeContentToObjectStorage } from "@/lib/chapters/persist-chapter-content";
import type { PersistEpisodeContentDbPatch } from "@/lib/chapters/persist-chapter-content";

export type ApplyEpisodeObjectStorageInput = {
  storyId: string;
  chapterId: string;
  content: string;
  structuredContent: unknown | null;
  contentFormat: string | null | undefined;
  excerpt?: string | null;
  previousObjectKey?: string | null;
};

export type ApplyEpisodeObjectStorageResult =
  | { ok: true; dbPatch: PersistEpisodeContentDbPatch }
  | { ok: false; error: string };

/** Writes body to S3 and patches the episodes row. */
export async function applyEpisodeObjectStorageAfterSave(
  db: DatabaseClient,
  input: ApplyEpisodeObjectStorageInput
): Promise<ApplyEpisodeObjectStorageResult> {
  const persisted = await persistEpisodeContentToObjectStorage({
    storyId: input.storyId,
    chapterId: input.chapterId,
    content: input.content,
    structuredContent: input.structuredContent,
    contentFormat: input.contentFormat,
    excerpt: input.excerpt,
    previousObjectKey: input.previousObjectKey
  });

  if (!persisted.ok) {
    return persisted;
  }

  const { error } = await db
    .from("episodes")
    .update({
      ...persisted.dbPatch,
      excerpt: input.excerpt?.trim() || persisted.dbPatch.excerpt
    })
    .eq("id", input.chapterId)
    .eq("story_id", input.storyId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return persisted;
}
