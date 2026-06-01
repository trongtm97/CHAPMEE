import { composerDocumentToPlainFallback } from "@/lib/composer/editor-state";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

function firstTextFromStructured(
  mode: PresentationMode,
  structured: unknown
): string | null {
  if (!structured || typeof structured !== "object") {
    return null;
  }

  const record = structured as Record<string, unknown>;

  if (mode === "chat_story" && Array.isArray(record.messages)) {
    for (const item of record.messages) {
      if (item && typeof item === "object" && "text" in item) {
        const text = String((item as { text?: string }).text ?? "").trim();
        if (text) {
          return text;
        }
      }
    }
  }

  if (mode === "diary" && Array.isArray(record.entries)) {
    const first = record.entries[0];
    if (first && typeof first === "object" && "content" in first) {
      return String((first as { content?: string }).content ?? "").trim() || null;
    }
  }

  if (mode === "case_file" && Array.isArray(record.sections)) {
    const first = record.sections[0];
    if (first && typeof first === "object" && "content" in first) {
      return String((first as { content?: string }).content ?? "").trim() || null;
    }
  }

  if (mode === "system_game" && Array.isArray(record.blocks)) {
    for (const block of record.blocks) {
      if (block && typeof block === "object" && "content" in block) {
        const text = String((block as { content?: string }).content ?? "").trim();
        if (text) {
          return text;
        }
      }
    }
  }

  if (mode === "social_feed" && Array.isArray(record.posts)) {
    const first = record.posts[0];
    if (first && typeof first === "object" && "text" in first) {
      return String((first as { text?: string }).text ?? "").trim() || null;
    }
  }

  if (mode === "script" && Array.isArray(record.lines)) {
    for (const line of record.lines) {
      if (line && typeof line === "object" && "text" in line) {
        const text = String((line as { text?: string }).text ?? "").trim();
        if (text) {
          return text;
        }
      }
    }
  }

  if (mode === "mixed_media" && Array.isArray(record.blocks)) {
    for (const block of record.blocks) {
      if (block && typeof block === "object" && "content" in block) {
        const text = String((block as { content?: string }).content ?? "").trim();
        if (text) {
          return text;
        }
      }
    }
  }

  return null;
}

/** Plain `content` column fallback when chapter uses structured_json only. */
export function buildPlainContentFallback(
  mode: PresentationMode,
  structured: unknown,
  existingPlain?: string
): string {
  const trimmed = existingPlain?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (isComposerStructuredDocument(structured)) {
    const fromComposer = composerDocumentToPlainFallback(
      structured as ComposerStructuredContent
    );
    if (fromComposer.trim()) {
      return fromComposer;
    }
  }

  const extracted = firstTextFromStructured(mode, structured);
  if (extracted) {
    return extracted;
  }

  return "Nội dung chương theo định dạng cấu trúc.";
}
