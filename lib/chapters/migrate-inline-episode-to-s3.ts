import "server-only";

import { resolveEpisodeStorageType } from "@/lib/chapters/episode-content-row";
import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import { applyEpisodeObjectStorageAfterSave } from "@/lib/chapters/apply-episode-object-storage-save";
import type { DatabaseClient } from "@/lib/db/types";

export const DEFAULT_INLINE_MIGRATE_THRESHOLD_CHARS = 32;

export type MigrateInlineEpisodeInput = EpisodeContentStorageRow & {
  story_id: string;
  content_format?: string | null;
};

export type MigrateInlineEpisodeResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; objectKey: string }
  | { ok: false; error: string };

export function shouldMigrateInlineEpisodeContent(
  row: MigrateInlineEpisodeInput,
  thresholdChars = DEFAULT_INLINE_MIGRATE_THRESHOLD_CHARS
): boolean {
  if (resolveEpisodeStorageType(row) !== "db") {
    return false;
  }
  if (row.content_object_key?.trim()) {
    return false;
  }
  const textLen = row.content?.trim().length ?? 0;
  if (textLen >= thresholdChars) {
    return true;
  }
  if (row.structured_content != null) {
    return true;
  }
  return false;
}

/** Migrates inline DB chapter body to S3 when eligible. */
export async function migrateInlineEpisodeContentToS3(
  db: DatabaseClient,
  row: MigrateInlineEpisodeInput,
  options?: {
    thresholdChars?: number;
    dryRun?: boolean;
  }
): Promise<MigrateInlineEpisodeResult> {
  if (!shouldMigrateInlineEpisodeContent(row, options?.thresholdChars)) {
    return { ok: true, skipped: true, reason: "not_eligible" };
  }

  const content = row.content?.trim() ?? "";
  if (!content && !row.structured_content) {
    return { ok: true, skipped: true, reason: "empty_body" };
  }

  if (options?.dryRun) {
    return { ok: true, skipped: false, objectKey: "(dry-run)" };
  }

  const result = await applyEpisodeObjectStorageAfterSave(db, {
    storyId: row.story_id,
    chapterId: row.id,
    content,
    structuredContent: row.structured_content ?? null,
    contentFormat: row.content_format ?? "plain_text",
    excerpt: row.excerpt,
    previousObjectKey: row.content_object_key
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, skipped: false, objectKey: result.dbPatch.content_object_key };
}
