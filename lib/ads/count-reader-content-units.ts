import { isComposerStructuredDocument } from "@/lib/composer/serializer";

/**
 * Estimates content blocks/paragraphs for mid-content ad gating.
 */
export function countReaderContentUnits(input: {
  content: string;
  structuredContent: unknown | null;
}): number {
  if (isComposerStructuredDocument(input.structuredContent)) {
    const blocks = input.structuredContent.blocks;
    return Array.isArray(blocks) ? blocks.length : 0;
  }

  const text = (input.content ?? "").trim();
  if (!text) {
    return 0;
  }

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return paragraphs.length > 0 ? paragraphs.length : 1;
}
