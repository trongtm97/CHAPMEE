import type {
  ChapterContentBlobFormat,
  ChapterContentEncoding,
  ChapterContentStorageType
} from "@/lib/content/chapter-content-types";

/** DB columns used for hybrid chapter body resolution (episodes table). */
export type EpisodeContentStorageRow = {
  id: string;
  story_id?: string;
  content?: string | null;
  structured_content?: unknown | null;
  content_format?: string | null;
  content_storage_type?: string | null;
  content_blob_format?: string | null;
  content_object_key?: string | null;
  content_hash?: string | null;
  content_size_bytes?: number | null;
  content_encoding?: string | null;
  plain_text_preview?: string | null;
  excerpt?: string | null;
  word_count?: number | null;
};

export const EPISODE_CONTENT_STORAGE_SELECT =
  "content_storage_type, content_blob_format, content_object_key, content_hash, content_size_bytes, content_encoding, plain_text_preview";

export const EPISODE_BODY_SELECT =
  `${EPISODE_CONTENT_STORAGE_SELECT}, content, structured_content, content_format, excerpt, word_count`;

export function resolveEpisodeStorageType(
  row: EpisodeContentStorageRow
): ChapterContentStorageType {
  const value = row.content_storage_type?.trim().toLowerCase();
  if (value === "s3" || value === "hybrid" || value === "db") {
    return value;
  }
  if (row.content_object_key?.trim()) {
    return "s3";
  }
  return "db";
}

export function resolveEpisodeBlobFormat(
  row: EpisodeContentStorageRow
): ChapterContentBlobFormat | null {
  const blob = row.content_blob_format?.trim().toLowerCase();
  if (
    blob === "text" ||
    blob === "markdown" ||
    blob === "json" ||
    blob === "composer_json"
  ) {
    return blob;
  }
  return null;
}

export function resolveEpisodeContentEncoding(
  row: EpisodeContentStorageRow
): ChapterContentEncoding {
  return row.content_encoding?.trim().toLowerCase() === "identity" ? "identity" : "gzip";
}

export const CHAPTER_CONTENT_UNAVAILABLE_MESSAGE =
  "Nội dung chương tạm thời không khả dụng.";
