import { composerDocumentToPlainFallback } from "@/lib/composer/editor-state";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { ChapterContentBlobFormat } from "@/lib/content/chapter-content-types";
import type { ChapterContentEnvelopeV1 } from "@/lib/content/chapter-content-types";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectStrings(value: unknown, out: string[], depth = 0) {
  if (depth > 12) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && trimmed.length < 50_000) {
      out.push(trimmed);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out, depth + 1);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectStrings(entry, out, depth + 1);
    }
  }
}

function plainFromStructuredJson(document: unknown): string {
  if (isComposerStructuredDocument(document)) {
    return composerDocumentToPlainFallback(document as ComposerStructuredContent);
  }
  const parts: string[] = [];
  collectStrings(document, parts);
  return parts.join("\n").replace(/\s+/g, " ").trim();
}

export function extractPlainTextFromEnvelope(envelope: ChapterContentEnvelopeV1): string {
  if (envelope.format === "text" || envelope.format === "markdown") {
    return String(envelope.text ?? "").trim();
  }
  if (envelope.format === "composer_json") {
    if (envelope.structured != null) {
      return plainFromStructuredJson(envelope.structured);
    }
    return String(envelope.text ?? "").trim();
  }
  if (envelope.format === "json") {
    if (typeof envelope.text === "string" && envelope.text.trim()) {
      return envelope.text.trim();
    }
    if (envelope.structured != null) {
      return plainFromStructuredJson(envelope.structured);
    }
  }
  return "";
}

export function extractPlainTextFromSaveInput(
  format: ChapterContentBlobFormat,
  content: string | unknown
): string {
  if (format === "text" || format === "markdown") {
    const raw = typeof content === "string" ? content : JSON.stringify(content);
    return format === "markdown" ? stripHtml(raw) : raw.trim();
  }
  if (format === "composer_json") {
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content) as unknown;
        return plainFromStructuredJson(parsed);
      } catch {
        return content.trim();
      }
    }
    return plainFromStructuredJson(content);
  }
  if (format === "json") {
    if (typeof content === "string") {
      try {
        return plainFromStructuredJson(JSON.parse(content));
      } catch {
        return content.trim();
      }
    }
    return plainFromStructuredJson(content);
  }
  return "";
}
