import { createHash, randomUUID } from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import {
  deleteObject,
  getObjectBytes,
  getTextS3Bucket,
  putObjectBytes
} from "@/lib/storage/s3";

const MAX_PREVIEW_CHARS = 280;

export type ReelsContentEnvelopeV1 = {
  v: 1;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
};

export type ReelsContentSaveInput = {
  reelId: string;
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
  /** Previous S3 key to delete after a successful replace. */
  previousObjectKey?: string | null;
  /** When set, skips envelope serialize — stores this envelope verbatim. */
  envelope?: ReelsContentEnvelopeV1;
};

export type ReelsContentSaveResult = {
  bucket: string;
  objectKey: string;
  hash: string;
  sizeBytes: number;
  encoding: "identity" | "gzip";
  bodyPreview: string;
  blobFormat: "json";
};

export type ReelsContentLoadInput = {
  objectKey: string;
  bucket?: string;
  expectedHash?: string;
};

export type ReelsContentLoadResult = {
  envelope: ReelsContentEnvelopeV1;
  hash: string;
  sizeBytes: number;
};

function buildReelsContentObjectKey(input: {
  reelId: string;
  date?: Date;
}): string {
  const date = input.date ?? new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `reels-content/${yyyy}/${mm}/${input.reelId}-${randomUUID()}.json.gz`;
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

function buildPreview(input: {
  title: string | null;
  hook: string | null;
  body: string | null;
  cta: string | null;
}): string {
  const parts = [input.hook, input.body, input.cta, input.title]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  const combined = parts.join("\n").trim();
  if (combined.length <= MAX_PREVIEW_CHARS) {
    return combined;
  }
  return combined.slice(0, MAX_PREVIEW_CHARS).trimEnd();
}

function toEnvelope(input: ReelsContentSaveInput): ReelsContentEnvelopeV1 {
  if (input.envelope) {
    return input.envelope;
  }
  return {
    v: 1,
    body: input.body ?? null,
    cta: input.cta ?? null,
    hook: input.hook ?? null,
    title: input.title ?? null
  };
}

export async function saveReelsContentObject(
  input: ReelsContentSaveInput
): Promise<ReelsContentSaveResult> {
  const bucket = getTextS3Bucket();
  const envelope = toEnvelope(input);
  const utf8 = safeJsonStringify(envelope);
  const { bytes, encoding } = tryGzip(utf8);
  const hash = computeContentHash(bytes);
  const sizeBytes = bytes.byteLength;
  const objectKey = buildReelsContentObjectKey({ reelId: input.reelId });

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

  const bodyPreview = buildPreview({
    body: envelope.body,
    cta: envelope.cta,
    hook: envelope.hook,
    title: envelope.title
  });

  return {
    blobFormat: "json",
    bodyPreview,
    bucket,
    encoding,
    hash,
    objectKey,
    sizeBytes
  };
}

export async function loadReelsContentObject(
  input: ReelsContentLoadInput
): Promise<ReelsContentLoadResult> {
  const bucket = input.bucket ?? getTextS3Bucket();
  const stored = await getObjectBytes({ bucket, objectKey: input.objectKey });
  const hash = computeContentHash(stored);

  if (input.expectedHash && input.expectedHash !== hash) {
    throw new Error(
      `Reels content hash mismatch for ${input.objectKey} (expected ${input.expectedHash}, got ${hash})`
    );
  }

  const utf8 = stored;
  const envelope = JSON.parse(utf8.toString("utf8")) as ReelsContentEnvelopeV1;
  if (envelope.v !== 1) {
    throw new Error(`Unsupported reels content envelope version: ${envelope.v}`);
  }

  return {
    envelope,
    hash,
    sizeBytes: stored.byteLength
  };
}

export async function deleteReelsContentObject(input: {
  objectKey: string;
  bucket?: string;
}) {
  await deleteObject(input.objectKey, input.bucket ?? getTextS3Bucket());
}

/**
 * Helper used by gunzip path; kept for parity with chapter-content-utils.
 */
export function gunzipReelsContent(bytes: Buffer): Buffer {
  return gunzipSync(bytes);
}
