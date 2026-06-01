import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { ComposerStructuredContent, ComposerBlockUnion } from "@/lib/composer/types";

function mediaIdsFromBlock(block: ComposerBlockUnion, ids: Set<string>) {
  if (block.type === "image" && block.data.media_id.trim()) {
    ids.add(block.data.media_id.trim());
  }
  if (block.type === "case_evidence") {
    for (const item of block.data.items) {
      if (item.media_id?.trim()) {
        ids.add(item.media_id.trim());
      }
    }
  }
}

export function collectMediaIdsFromComposer(
  structured: unknown | null
): string[] {
  if (!structured || !isComposerStructuredDocument(structured)) {
    return [];
  }

  const ids = new Set<string>();
  for (const block of structured.blocks) {
    mediaIdsFromBlock(block, ids);
  }
  return [...ids];
}

export function collectMediaIdsFromBlocks(blocks: ComposerBlockUnion[]): string[] {
  const ids = new Set<string>();
  for (const block of blocks) {
    mediaIdsFromBlock(block, ids);
  }
  return [...ids];
}
