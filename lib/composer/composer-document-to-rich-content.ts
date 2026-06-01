import { buildChapterImageBlockToken } from "@/lib/editor/chapter-image-block";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import type { ComposerBlockUnion, ComposerStructuredContent } from "@/lib/composer/types";

function blockToLines(
  block: ComposerBlockUnion,
  imageMap: ChapterImageMap
): string[] {
  switch (block.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, block.data.level));
      const prefix = "#".repeat(level);
      return block.data.text.trim() ? [`${prefix} ${block.data.text.trim()}`, ""] : [];
    }
    case "prose":
      return block.data.text.trim() ? [block.data.text.trim(), ""] : [];
    case "quote": {
      const lines = block.data.text.split("\n").map((line) => `> ${line}`);
      if (block.data.source.trim()) {
        lines.push(`> — ${block.data.source.trim()}`);
      }
      lines.push("");
      return lines;
    }
    case "divider":
      return ["---", ""];
    case "image": {
      const id = block.data.media_id.trim();
      const resolved = imageMap[id];
      if (resolved) {
        const tokenBlock = {
          ...resolved,
          alt: block.data.alt.trim() || resolved.alt,
          caption: block.data.caption.trim() || resolved.caption
        };
        return [buildChapterImageBlockToken(tokenBlock), ""];
      }
      return block.data.caption.trim()
        ? [`[Ảnh: ${block.data.caption.trim()}]`, ""]
        : [];
    }
    default:
      return [];
  }
}

/** Rich plain content with chapmee-image tokens for prose-compatible blocks. */
export function composerDocumentToRichContent(
  doc: ComposerStructuredContent,
  imageMap: ChapterImageMap = {}
): string {
  const lines: string[] = [];

  for (const block of doc.blocks) {
    lines.push(...blockToLines(block, imageMap));
  }

  return lines.join("\n").trim();
}

export function mergeComposerPlainWithImages(
  doc: ComposerStructuredContent,
  imageMap: ChapterImageMap,
  existingPlain?: string
): string {
  const fromBlocks = composerDocumentToRichContent(doc, imageMap);
  if (fromBlocks) {
    return fromBlocks;
  }
  return existingPlain?.trim() ?? "";
}
