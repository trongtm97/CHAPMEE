import { parseMarkdownContent } from "@/lib/platform-content/render-markdown-content";

const MID_AD_RATIO = 0.4;
const MIN_BLOCKS = 6;

export function splitArticleMarkdownForMidAd(
  content: string,
  minBlocks = MIN_BLOCKS
): { first: string; second: string } | null {
  const blocks = parseMarkdownContent(content.trim());
  if (blocks.length < minBlocks) {
    return null;
  }

  let splitAt = Math.max(3, Math.floor(blocks.length * MID_AD_RATIO));
  splitAt = Math.min(splitAt, blocks.length - 3);

  const blockAtSplit = blocks[splitAt];
  if (blockAtSplit?.type === "h2" || blockAtSplit?.type === "h3" || blockAtSplit?.type === "h4") {
    splitAt += 1;
  }

  if (splitAt >= blocks.length - 2) {
    return null;
  }

  const firstBlocks = blocks.slice(0, splitAt);
  const secondBlocks = blocks.slice(splitAt);

  if (firstBlocks.length === 0 || secondBlocks.length === 0) {
    return null;
  }

  return {
    first: serializeBlocksToMarkdown(firstBlocks),
    second: serializeBlocksToMarkdown(secondBlocks)
  };
}

type ParsedBlock = ReturnType<typeof parseMarkdownContent>[number];

function serializeBlocksToMarkdown(blocks: ParsedBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type === "h2") {
      lines.push(`## ${block.text}`, "");
    } else if (block.type === "h3") {
      lines.push(`### ${block.text}`, "");
    } else if (block.type === "h4") {
      lines.push(`#### ${block.text}`, "");
    } else if (block.type === "quote") {
      lines.push(`> ${block.text}`, "");
    } else if (block.type === "ul") {
      for (const item of block.items) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    } else if (block.type === "ol") {
      block.items.forEach((item, i) => {
        lines.push(`${i + 1}. ${item}`);
      });
      lines.push("");
    } else if (block.type === "hr") {
      lines.push("---", "");
    } else {
      lines.push(block.text, "");
    }
  }
  return lines.join("\n").trim();
}
