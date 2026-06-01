import { isComposerStructuredDocument, isStructuredContentFormat } from "@/lib/composer/serializer";
import type { ComposerContentFormat } from "@/lib/composer/types";
import type { ContentFormat } from "@/types/presentation";

/** Episode uses legacy T6 JSON shape (not Composer v1 blocks). */
export function isLegacyStructuredJson(
  format: string | null | undefined,
  structuredContent: unknown | null
): boolean {
  if (!isStructuredContentFormat(format) || structuredContent == null) {
    return false;
  }
  return !isComposerStructuredDocument(structuredContent);
}

export function isComposerBlocksFormat(
  format: string | null | undefined
): format is "structured_blocks" {
  return format === "structured_blocks";
}

export function shouldUseStructuredRenderer(
  format: string | null | undefined,
  structuredContent: unknown | null
): boolean {
  if (!isStructuredContentFormat(format)) {
    return false;
  }
  return structuredContent != null;
}

export function toComposerContentFormat(
  format: ContentFormat | null | undefined
): ComposerContentFormat {
  if (format === "structured_blocks" || format === "structured_json") {
    return format;
  }
  if (format === "markdown" || format === "rich_text" || format === "plain_text") {
    return format;
  }
  return "rich_text";
}
