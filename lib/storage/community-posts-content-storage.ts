import { createHash, randomUUID } from "crypto";
import { gzipSync } from "zlib";
import {
  deleteObject,
  getObjectBytes,
  getTextS3Bucket,
  putObjectBytes
} from "@/lib/storage/s3";

const MAX_PREVIEW_CHARS = 280;

export type CommunityPostContentEnvelopeV1 = {
  v: 1;
  title: string | null;
  content: string;
};

export type CommunityPostContentSaveInput = {
  postId: string;
  title: string | null;
  content: string;
  previousObjectKey?: string | null;
  envelope?: CommunityPostContentEnvelopeV1;
};

export type CommunityPostContentSaveResult = {
  bucket: string;
  objectKey: string;
  hash: string;
  sizeBytes: number;
  encoding: "identity" | "gzip";
  contentPreview: string;
  blobFormat: "json";
};

export type CommunityPostContentLoadInput = {
  objectKey: string;
  bucket?: string;
  expectedHash?: string;
};

export type CommunityPostContentLoadResult = {
  envelope: CommunityPostContentEnvelopeV1;
  hash: string;
  sizeBytes: number;
};

function buildCommunityPostObjectKey(input: {
  postId: string;
  date?: Date;
}): string {
  const date = input.date ?? new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `community-content/${yyyy}/${mm}/${input.postId}-${randomUUID()}.json.gz`;
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

function buildPreview(input: { title: string | null; content: string }): string {
  const parts = [input.title, input.content]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  const combined = parts.join("\n").trim();
  if (combined.length <= MAX_PREVIEW_CHARS) {
    return combined;
  }
  return combined.slice(0, MAX_PREVIEW_CHARS).trimEnd();
}

function toEnvelope(input: CommunityPostContentSaveInput): CommunityPostContentEnvelopeV1 {
  if (input.envelope) {
    return input.envelope;
  }
  return {
    v: 1,
    content: input.content,
    title: input.title ?? null
  };
}

export async function saveCommunityPostContentObject(
  input: CommunityPostContentSaveInput
): Promise<CommunityPostContentSaveResult> {
  const bucket = getTextS3Bucket();
  const envelope = toEnvelope(input);
  const utf8 = safeJsonStringify(envelope);
  const { bytes, encoding } = tryGzip(utf8);
  const hash = computeContentHash(bytes);
  const sizeBytes = bytes.byteLength;
  const objectKey = buildCommunityPostObjectKey({ postId: input.postId });

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

  const contentPreview = buildPreview({
    content: envelope.content,
    title: envelope.title
  });

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

export async function loadCommunityPostContentObject(
  input: CommunityPostContentLoadInput
): Promise<CommunityPostContentLoadResult> {
  const bucket = input.bucket ?? getTextS3Bucket();
  const stored = await getObjectBytes({ bucket, objectKey: input.objectKey });
  const hash = computeContentHash(stored);

  if (input.expectedHash && input.expectedHash !== hash) {
    throw new Error(
      `Community post content hash mismatch for ${input.objectKey} (expected ${input.expectedHash}, got ${hash})`
    );
  }

  const envelope = JSON.parse(stored.toString("utf8")) as CommunityPostContentEnvelopeV1;
  if (envelope.v !== 1) {
    throw new Error(`Unsupported community post envelope version: ${envelope.v}`);
  }

  return {
    envelope,
    hash,
    sizeBytes: stored.byteLength
  };
}

export async function deleteCommunityPostContentObject(input: {
  objectKey: string;
  bucket?: string;
}) {
  await deleteObject(input.objectKey, input.bucket ?? getTextS3Bucket());
}
