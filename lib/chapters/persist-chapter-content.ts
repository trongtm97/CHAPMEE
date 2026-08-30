import "server-only";

import { validateEpisodeBodyForStorage } from "@/lib/content/content-local-url-guard";
import {
  buildStorageEnvelopeFromEpisodeFields,
  mapEpisodeContentFormatToBlobFormat
} from "@/lib/content/chapter-content-utils";
import { clearChapterContentCache } from "@/lib/chapters/chapter-content-cache";
import { saveChapterContentObject } from "@/lib/storage/chapter-content-storage";

export type PersistEpisodeContentInput = {
  storyId: string;
  chapterId: string;
  content: string;
  structuredContent: unknown | null;
  contentFormat: string | null | undefined;
  excerpt?: string | null;
  previousObjectKey?: string | null;
};

export type PersistEpisodeContentDbPatch = {
  content_storage_type: "s3";
  content_blob_format: string;
  content_object_key: string;
  content_hash: string;
  content_size_bytes: number;
  content_encoding: string;
  excerpt: string | null;
  plain_text_preview: string;
  word_count: number;
  content_updated_at: string;
  content: string;
  structured_content: null;
};

export type PersistEpisodeContentResult =
  | { ok: true; dbPatch: PersistEpisodeContentDbPatch }
  | { ok: false; error: string };

/**
 * Writes canonical chapter body to MinIO/S3 and returns DB metadata patch.
 * Does not touch the database — caller applies dbPatch after insert/update.
 */
export async function persistEpisodeContentToObjectStorage(
  input: PersistEpisodeContentInput
): Promise<PersistEpisodeContentResult> {
  const urlCheck = validateEpisodeBodyForStorage({
    content: input.content,
    structuredContent: input.structuredContent
  });
  if (!urlCheck.ok) {
    return { ok: false, error: urlCheck.error };
  }

  const envelope = buildStorageEnvelopeFromEpisodeFields({
    content: input.content,
    structuredContent: input.structuredContent,
    contentFormat: input.contentFormat
  });
  const blobFormat = mapEpisodeContentFormatToBlobFormat(input.contentFormat);

  try {
    const saved = await saveChapterContentObject({
      storyId: input.storyId,
      chapterId: input.chapterId,
      format: blobFormat,
      content: input.content,
      envelope,
      previousObjectKey: input.previousObjectKey ?? undefined
    });

    clearChapterContentCache(input.chapterId);

    const excerpt =
      input.excerpt?.trim() || saved.excerpt.trim() || null;

    return {
      ok: true,
      dbPatch: {
        content_storage_type: "s3",
        content_blob_format: saved.blobFormat,
        content_object_key: saved.objectKey,
        content_hash: saved.hash,
        content_size_bytes: saved.sizeBytes,
        content_encoding: saved.encoding,
        excerpt,
        plain_text_preview: saved.plainTextPreview,
        word_count: saved.wordCount,
        content_updated_at: new Date().toISOString(),
        // ponytail: giữ bản inline để Studio/reader vẫn có xuống dòng nếu S3 đọc lỗi
        content: input.content,
        structured_content: null
      }
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Không lưu được nội dung chương lên storage."
    };
  }
}
