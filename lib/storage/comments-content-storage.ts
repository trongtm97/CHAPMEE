import { createHash, randomUUID } from "crypto";
import { gzipSync } from "zlib";
import {
  deleteObject,
  getObjectBytes,
  getTextS3Bucket,
  putObjectBytes
} from "@/lib/storage/s3";

const MAX_PREVIEW_CHARS = 280;

export type CommentContentEnvelopeV1 = {
  v: 1;
  content: string;
};

export type CommentContentSaveInput = {
  commentId: string;
  content: string;
  previousObjectKey?: string | null;
  envelope?: CommentContentEnvelopeV1;
};

export type CommentContentSaveResult = {
  bucket: string;
  objectKey: string;
  hash: string;
  sizeBytes: number;
  encoding: "identity" | "gzip";
  contentPreview: string;
  blobFormat: "json";
};

export type CommentContentLoadInput = {
  objectKey: string;
  bucket?: string;
  expectedHash?: string;
};

export type CommentContentLoadResult = {
  envelope: CommentContentEnvelopeV1;
  hash: string;
  sizeBytes: number;
};

function buildCommentObjectKey(input: {
  commentId: string;
  date?: Date;
}): string {
  const date = input.date ?? new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `comments-content/${yyyy}/${mm}/${input.commentId}-${randomUUID()}.json.gz`;
}

function safeJsonStringify(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

function computeContentHash(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function tryGzip(bytes: Buffer): { bytes: Buffer; encoding: "identity" | "gzip" } {
  try {
    return { bytes: gzipSync(bytes), encoding: "gzip" };
  } catch {
    return { bytes, encoding: "identity" };
  }
}

function buildPreview(content: string): string {
  const trimmed = (content ?? "").trim();
  if (trimmed.length <= MAX_PREVIEW_CHARS) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_PREVIEW_CHARS).trimEnd();
}

function toEnvelope(input: CommentContentSaveInput): CommentContentEnvelopeV1 {
  if (input.envelope) {
    return input.envelope;
  }
  return { v: 1, content: input.content };
}

export async function saveCommentContentObject(
  input: CommentContentSaveInput
): Promise<CommentContentSaveResult> {
  const bucket = getTextS3Bucket();
  const envelope = toEnvelope(input);
  const utf8 = safeJsonStringify(envelope);
  const { bytes, encoding } = tryGzip(utf8);
  const hash = computeContentHash(bytes);
  const sizeBytes = bytes.byteLength;
  const objectKey = buildCommentObjectKey({ commentId: input.commentId });

  await putObjectBytes({
    bucket,
    objectKey,
    body: bytes,
    contentType: "application/json",
    contentEncoding: encoding === "gzip" ? "gzip" : undefined
  });

  if (
    input.previousObjectKey &&
    input.previousObjectKey !== objectKey
  ) {
    try {
      await deleteObject(input.previousObjectKey, bucket);
    } catch {
      // Best-effort; previous key may already be gone.
    }
  }

  const contentPreview = buildPreview(envelope.content);

  return {
    blobFormat: "json",
    bucket,
    contentPreview,
    encoding,
    hash,
    objectKey,
    sizeBytes
  };
}

export async function loadCommentContentObject(
  input: CommentContentLoadInput
): Promise<CommentContentLoadResult> {
  const bucket = input.bucket ?? getTextS3Bucket();
  const stored = await getObjectBytes({ bucket, objectKey: input.objectKey });
  const hash = computeContentHash(stored);

  if (input.expectedHash && input.expectedHash !== hash) {
    throw new Error(
      `Comment content hash mismatch for ${input.objectKey} (expected ${input.expectedHash}, got ${hash})`
    );
  }

  const envelope = JSON.parse(stored.toString("utf8")) as CommentContentEnvelopeV1;
  if (envelope.v !== 1) {
    throw new Error(`Unsupported comment envelope version: ${envelope.v}`);
  }

  return {
    envelope,
    hash,
    sizeBytes: stored.byteLength
  };
}

export async function deleteCommentContentObject(input: {
  objectKey: string;
  bucket?: string;
}) {
  await deleteObject(input.objectKey, input.bucket ?? getTextS3Bucket());
}
