import { buildChapterContentObjectKey } from "@/lib/content/chapter-content-object-key";
import type {
  ChapterContentBlobFormat,
  ChapterContentEncoding,
  ChapterContentEnvelopeV1,
  ChapterContentLoadInput,
  ChapterContentLoadResult,
  ChapterContentSaveInput,
  ChapterContentSaveResult
} from "@/lib/content/chapter-content-types";
import {
  buildChapterTextDerivatives,
  computeContentHash,
  contentTypeForBlobFormat,
  decodeChapterContentBytes,
  deserializeChapterContent,
  encodeChapterContentBytes,
  envelopeToLoadContent,
  serializeChapterContentToUtf8,
  serializeEnvelopeToUtf8,
  verifyContentHash
} from "@/lib/content/chapter-content-utils";
import {
  deleteObject,
  getObjectBytes,
  getTextS3Bucket,
  objectExists,
  putObjectBytes
} from "@/lib/storage/s3";

export {
  buildChapterContentObjectKey,
  getChapterContentObjectKey
} from "@/lib/content/chapter-content-object-key";
export {
  computeContentHash,
  deserializeChapterContent,
  encodeChapterContentBytes,
  gzipContent,
  gunzipContent,
  mapEpisodeContentFormatToBlobFormat,
  serializeChapterContent,
  verifyContentHash
} from "@/lib/content/chapter-content-utils";
export type {
  ChapterContentBlobFormat,
  ChapterContentEncoding,
  ChapterContentLoadInput,
  ChapterContentLoadResult,
  ChapterContentSaveInput,
  ChapterContentSaveResult,
  ChapterContentStorageType
} from "@/lib/content/chapter-content-types";

export type ChapterContentSaveInputExtended = ChapterContentSaveInput & {
  /** When set, skips serializeChapterContent and stores this envelope verbatim. */
  envelope?: ChapterContentEnvelopeV1;
};

export async function saveChapterContentObject(
  input: ChapterContentSaveInputExtended
): Promise<ChapterContentSaveResult> {
  const bucket = input.bucket ?? getTextS3Bucket();
  const preferredEncoding: ChapterContentEncoding = input.encoding ?? "gzip";
  const blobFormat = input.envelope?.format ?? input.format;
  const utf8 = input.envelope
    ? serializeEnvelopeToUtf8(input.envelope)
    : serializeChapterContentToUtf8(blobFormat, input.content);
  const { bytes, encoding } = encodeChapterContentBytes(utf8, preferredEncoding);
  const hash = computeContentHash(bytes);
  const sizeBytes = bytes.byteLength;

  const objectKey = buildChapterContentObjectKey({
    storyId: input.storyId,
    chapterId: input.chapterId,
    format: blobFormat,
    date: input.keyDate,
    gzip: encoding === "gzip"
  });

  await putObjectBytes({
    bucket,
    objectKey,
    body: bytes,
    contentType: contentTypeForBlobFormat(blobFormat),
    contentEncoding: encoding === "gzip" ? "gzip" : undefined
  });

  if (
    input.previousObjectKey &&
    input.previousObjectKey !== objectKey
  ) {
    try {
      await deleteChapterContentObject({
        objectKey: input.previousObjectKey,
        bucket
      });
    } catch {
      // Best-effort; old key may already be gone.
    }
  }

  const envelope = deserializeChapterContent(
    decodeChapterContentBytes(bytes, encoding),
    blobFormat
  );
  const { excerpt, plainTextPreview, wordCount } = buildChapterTextDerivatives(envelope);

  return {
    bucket,
    objectKey,
    hash,
    sizeBytes,
    encoding,
    wordCount,
    excerpt,
    plainTextPreview,
    blobFormat: input.format
  };
}

export async function loadChapterContentObject(
  input: ChapterContentLoadInput
): Promise<ChapterContentLoadResult> {
  const bucket = input.bucket ?? getTextS3Bucket();
  const stored = await getObjectBytes({ bucket, objectKey: input.objectKey });
  const hash = computeContentHash(stored);

  if (input.expectedHash && !verifyContentHash(stored, input.expectedHash)) {
    throw new Error(
      `Chapter content hash mismatch for ${input.objectKey} (expected ${input.expectedHash}, got ${hash})`
    );
  }

  const utf8 = decodeChapterContentBytes(stored, input.encoding);
  const envelope = deserializeChapterContent(utf8, input.format);

  return {
    content: envelopeToLoadContent(envelope),
    envelope,
    hash,
    sizeBytes: stored.byteLength
  };
}

export async function deleteChapterContentObject(input: {
  objectKey: string;
  bucket?: string;
}) {
  await deleteObject(input.objectKey, input.bucket);
}

export async function chapterContentObjectExists(input: {
  objectKey: string;
  bucket?: string;
}) {
  return objectExists(input.objectKey, input.bucket);
}
