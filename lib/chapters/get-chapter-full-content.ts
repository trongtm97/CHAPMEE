import "server-only";

import {
  mapEpisodeContentFormatToBlobFormat,
  unpackStorageEnvelopeToEpisodeFields
} from "@/lib/content/chapter-content-utils";
import type { ChapterContentEnvelopeV1 } from "@/lib/content/chapter-content-types";
import {
  CHAPTER_CONTENT_UNAVAILABLE_MESSAGE,
  type EpisodeContentStorageRow,
  resolveEpisodeBlobFormat,
  resolveEpisodeContentEncoding,
  resolveEpisodeStorageType
} from "@/lib/chapters/episode-content-row";
import {
  getCachedChapterContent,
  setCachedChapterContent
} from "@/lib/cache/chapter-content-cache";
import { loadChapterContentObject } from "@/lib/storage/chapter-content-storage";

export type ChapterFullContent = {
  content: string;
  structuredContent: unknown | null;
  source: "db" | "s3" | "cache" | "preview";
  unavailableMessage?: string;
};

export type GetChapterFullContentOptions = {
  /** When false, returns DB preview only for S3-backed chapters (paid gate / unauthorized). */
  allowS3Fetch?: boolean;
};

function legacyBodyFromRow(row: EpisodeContentStorageRow): ChapterFullContent {
  return {
    content: row.content ?? "",
    structuredContent: row.structured_content ?? null,
    source: "db"
  };
}

function previewBodyFromRow(row: EpisodeContentStorageRow): ChapterFullContent {
  const preview = row.plain_text_preview?.trim() || row.excerpt?.trim() || "";
  return {
    content: preview,
    structuredContent: null,
    source: "preview"
  };
}

function bodyFromEnvelope(
  envelope: ChapterContentEnvelopeV1,
  source: "s3" | "cache"
): ChapterFullContent {
  const { content, structuredContent } = unpackStorageEnvelopeToEpisodeFields(envelope);
  return { content, structuredContent, source };
}

/**
 * Resolves full chapter body from DB inline fields or MinIO/S3 object storage.
 * Legacy rows (content_storage_type=db) read episodes.content / structured_content.
 */
export async function getChapterFullContent(
  row: EpisodeContentStorageRow,
  options?: GetChapterFullContentOptions
): Promise<ChapterFullContent> {
  const storageType = resolveEpisodeStorageType(row);
  const allowS3Fetch = options?.allowS3Fetch !== false;

  if (!allowS3Fetch) {
    return previewBodyFromRow(row);
  }

  if (storageType === "db") {
    return legacyBodyFromRow(row);
  }

  const objectKey = row.content_object_key?.trim();
  if (!objectKey) {
    if (row.content?.trim() || row.structured_content) {
      return legacyBodyFromRow(row);
    }
    return {
      content: "",
      structuredContent: null,
      source: "db",
      unavailableMessage: CHAPTER_CONTENT_UNAVAILABLE_MESSAGE
    };
  }

  if (!allowS3Fetch) {
    return previewBodyFromRow(row);
  }

  const blobFormat =
    resolveEpisodeBlobFormat(row) ??
    mapEpisodeContentFormatToBlobFormat(row.content_format);
  const encoding = resolveEpisodeContentEncoding(row);
  const contentHash = row.content_hash?.trim();

  if (contentHash) {
    const cached = await getCachedChapterContent(row.id, contentHash);
    if (cached) {
      return bodyFromEnvelope(cached, "cache");
    }
  }

  try {
    const loaded = await loadChapterContentObject({
      objectKey,
      format: blobFormat,
      encoding,
      expectedHash: contentHash ?? undefined
    });

    const envelope = loaded.envelope;

    if (contentHash) {
      await setCachedChapterContent(row.id, contentHash, envelope);
    }

    return bodyFromEnvelope(envelope, "s3");
  } catch (error) {
    console.warn("[getChapterFullContent] S3 load failed", {
      chapterId: row.id,
      objectKey,
      error: error instanceof Error ? error.message : error
    });

    if (row.content?.trim() || row.structured_content) {
      return legacyBodyFromRow(row);
    }

    const preview = previewBodyFromRow(row);
    if (preview.content) {
      return preview;
    }

    return {
      content: "",
      structuredContent: null,
      source: "s3",
      unavailableMessage: CHAPTER_CONTENT_UNAVAILABLE_MESSAGE
    };
  }
}
