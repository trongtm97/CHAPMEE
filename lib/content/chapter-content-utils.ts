import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import type {
  ChapterContentBlobFormat,
  ChapterContentEncoding,
  ChapterContentEnvelopeV1
} from "@/lib/content/chapter-content-types";
import { extractPlainTextFromEnvelope } from "@/lib/content/extract-plain-text";
import { countWords } from "@/lib/text/countWords";

export const CHAPTER_CONTENT_ENVELOPE_VERSION = 1 as const;
export const CHAPTER_EXCERPT_MAX_CHARS = 280;
export const CHAPTER_PLAIN_TEXT_PREVIEW_MAX_CHARS = 4_000;

/**
 * SHA-256 hex digest of the **stored object bytes** (gzip output when encoding=gzip).
 * Used for integrity checks and MinIO → Vietnix sync verification.
 */
export function computeContentHash(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function verifyContentHash(bytes: Buffer | Uint8Array, expectedHex: string): boolean {
  const normalized = expectedHex.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    return false;
  }
  return computeContentHash(bytes) === normalized;
}

export function gzipContent(input: Buffer | string): Buffer {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return gzipSync(buf);
}

export function gunzipContent(input: Buffer): Buffer {
  return gunzipSync(input);
}

export function serializeChapterContent(
  format: ChapterContentBlobFormat,
  content: string | unknown
): ChapterContentEnvelopeV1 {
  if (format === "text" || format === "markdown") {
    const text = typeof content === "string" ? content : String(content ?? "");
    return { v: CHAPTER_CONTENT_ENVELOPE_VERSION, format, text };
  }

  if (format === "json" || format === "composer_json") {
    if (typeof content === "string") {
      try {
        return {
          v: CHAPTER_CONTENT_ENVELOPE_VERSION,
          format,
          structured: JSON.parse(content) as unknown
        };
      } catch {
        return { v: CHAPTER_CONTENT_ENVELOPE_VERSION, format, text: content };
      }
    }
    return {
      v: CHAPTER_CONTENT_ENVELOPE_VERSION,
      format,
      structured: content
    };
  }

  return { v: CHAPTER_CONTENT_ENVELOPE_VERSION, format: "text", text: String(content ?? "") };
}

export function serializeChapterContentToUtf8(
  format: ChapterContentBlobFormat,
  content: string | unknown
): Buffer {
  const envelope = serializeChapterContent(format, content);
  return Buffer.from(JSON.stringify(envelope), "utf8");
}

export function deserializeChapterContent(
  buffer: Buffer,
  format: ChapterContentBlobFormat
): ChapterContentEnvelopeV1 {
  const raw = buffer.toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    if (format === "text" || format === "markdown") {
      return { v: CHAPTER_CONTENT_ENVELOPE_VERSION, format, text: raw };
    }
    throw new Error("Chapter content blob is not valid JSON envelope");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Chapter content envelope must be an object");
  }

  const record = parsed as Record<string, unknown>;
  if (record.v === CHAPTER_CONTENT_ENVELOPE_VERSION && typeof record.format === "string") {
    return record as ChapterContentEnvelopeV1;
  }

  return {
    v: CHAPTER_CONTENT_ENVELOPE_VERSION,
    format,
    structured: parsed
  };
}

export function envelopeToLoadContent(envelope: ChapterContentEnvelopeV1): string | unknown {
  if (envelope.format === "text" || envelope.format === "markdown") {
    return envelope.text ?? "";
  }
  if (envelope.structured !== undefined) {
    return envelope.structured;
  }
  return envelope.text ?? "";
}

export function encodeChapterContentBytes(
  utf8: Buffer,
  encoding: ChapterContentEncoding
): { bytes: Buffer; encoding: ChapterContentEncoding } {
  if (encoding === "identity") {
    return { bytes: utf8, encoding: "identity" };
  }
  try {
    return { bytes: gzipContent(utf8), encoding: "gzip" };
  } catch {
    return { bytes: utf8, encoding: "identity" };
  }
}

export function decodeChapterContentBytes(
  bytes: Buffer,
  encoding: ChapterContentEncoding
): Buffer {
  if (encoding === "gzip") {
    return gunzipContent(bytes);
  }
  return bytes;
}

export function buildChapterTextDerivatives(envelope: ChapterContentEnvelopeV1): {
  plainText: string;
  excerpt: string;
  plainTextPreview: string;
  wordCount: number;
} {
  const plainText = extractPlainTextFromEnvelope(envelope);
  const excerpt = plainText.replace(/\s+/g, " ").trim().slice(0, CHAPTER_EXCERPT_MAX_CHARS);
  const plainTextPreview = plainText.slice(0, CHAPTER_PLAIN_TEXT_PREVIEW_MAX_CHARS).trim();
  const wordCount = countWords(plainText.replace(/\s+/g, " "));
  return { plainText, excerpt, plainTextPreview, wordCount };
}

export function contentTypeForBlobFormat(format: ChapterContentBlobFormat): string {
  switch (format) {
    case "markdown":
      return "text/markdown; charset=utf-8";
    case "text":
      return "text/plain; charset=utf-8";
    case "json":
    case "composer_json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export function buildStorageEnvelopeFromEpisodeFields(input: {
  content: string;
  structuredContent: unknown | null;
  contentFormat: string | null | undefined;
}): ChapterContentEnvelopeV1 {
  const format = mapEpisodeContentFormatToBlobFormat(input.contentFormat);
  if (format === "composer_json" || format === "json") {
    return {
      v: CHAPTER_CONTENT_ENVELOPE_VERSION,
      format,
      text: input.content,
      structured: input.structuredContent ?? undefined
    };
  }
  return {
    v: CHAPTER_CONTENT_ENVELOPE_VERSION,
    format,
    text: input.content
  };
}

export function unpackStorageEnvelopeToEpisodeFields(envelope: ChapterContentEnvelopeV1): {
  content: string;
  structuredContent: unknown | null;
} {
  if (envelope.format === "composer_json" || envelope.format === "json") {
    const structuredContent = envelope.structured ?? null;
    const content =
      envelope.text?.trim() || extractPlainTextFromEnvelope(envelope).trim();
    return { content, structuredContent };
  }
  return {
    content: envelope.text ?? "",
    structuredContent: null
  };
}

export function serializeEnvelopeToUtf8(envelope: ChapterContentEnvelopeV1): Buffer {
  return Buffer.from(JSON.stringify(envelope), "utf8");
}

/** Map episodes.content_format (app) → S3 blob format. */
export function mapEpisodeContentFormatToBlobFormat(
  contentFormat: string | null | undefined
): ChapterContentBlobFormat {
  switch (contentFormat) {
    case "plain_text":
      return "text";
    case "markdown":
      return "markdown";
    case "rich_text":
      return "markdown";
    case "structured_json":
      return "json";
    case "structured_blocks":
      return "composer_json";
    default:
      return "text";
  }
}
