/** S3 blob logical format (stored in episodes.content_blob_format). */
export type ChapterContentBlobFormat = "text" | "markdown" | "json" | "composer_json";

export type ChapterContentEncoding = "identity" | "gzip";

export type ChapterContentStorageType = "db" | "s3" | "hybrid";

/** Canonical envelope version written to S3 (UTF-8 JSON before gzip). */
export type ChapterContentEnvelopeV1 = {
  v: 1;
  format: ChapterContentBlobFormat;
  text?: string;
  structured?: unknown;
};

export type ChapterContentSaveInput = {
  storyId: string;
  chapterId: string;
  format: ChapterContentBlobFormat;
  /** Plain/markdown string, or JSON/composer object for json/composer_json. */
  content: string | unknown;
  bucket?: string;
  previousObjectKey?: string | null;
  /** Default gzip; set identity only when gzip fails or for tests. */
  encoding?: ChapterContentEncoding;
  /** Reference date for object key path segments (default: now UTC). */
  keyDate?: Date;
};

export type ChapterContentSaveResult = {
  bucket: string;
  objectKey: string;
  hash: string;
  sizeBytes: number;
  encoding: ChapterContentEncoding;
  wordCount: number;
  excerpt: string;
  plainTextPreview: string;
  blobFormat: ChapterContentBlobFormat;
};

export type ChapterContentLoadInput = {
  objectKey: string;
  format: ChapterContentBlobFormat;
  encoding: ChapterContentEncoding;
  bucket?: string;
  /** When set, verify object bytes match this SHA-256 hex. */
  expectedHash?: string | null;
};

export type ChapterContentLoadResult = {
  content: string | unknown;
  envelope: ChapterContentEnvelopeV1;
  hash: string;
  sizeBytes: number;
};
