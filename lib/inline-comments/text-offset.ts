import {
  BLOCK_ID_DATA_ATTR,
  BLOCK_INDEX_DATA_ATTR,
  buildComposerBlockId,
  buildLegacyParagraphBlockId
} from "@/lib/reader/block-ids";

/** Minimum selected characters to create an inline comment. */
export const INLINE_COMMENT_MIN_SELECTION_LENGTH = 3;

/** Maximum quote snapshot length (matches DB constraint). */
export const INLINE_COMMENT_QUOTE_MAX = 500;

/**
 * Block plain text uses the DOM textContent of the block element (UTF-16 code units).
 */
export function getBlockPlainText(element: HTMLElement): string {
  return element.textContent ?? "";
}

function walkTextNodes(root: Node, callback: (node: Text) => void) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    callback(current as Text);
    current = walker.nextNode();
  }
}

function offsetBeforeNode(block: HTMLElement, targetNode: Node, targetOffset: number): number {
  let total = 0;
  let found = false;

  walkTextNodes(block, (textNode) => {
    if (found) {
      return;
    }
    if (textNode === targetNode) {
      total += targetOffset;
      found = true;
      return;
    }
    total += textNode.data.length;
  });

  return total;
}

function findBlockElement(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node.parentElement;
  return el?.closest(`[${BLOCK_ID_DATA_ATTR}]`) as HTMLElement | null;
}

export type SelectionAnchorPayload = {
  blockId: string;
  blockIndex: number | null;
  startOffset: number;
  endOffset: number;
  quoteText: string;
  prefixText: string | null;
  suffixText: string | null;
};

export function getSelectionAnchorFromRange(
  range: Range
): SelectionAnchorPayload | null {
  const startBlock = findBlockElement(range.startContainer);
  const endBlock = findBlockElement(range.endContainer);

  if (!startBlock || !endBlock) {
    return null;
  }

  if (startBlock !== endBlock) {
    return null;
  }

  const block = startBlock;
  const blockId = block.getAttribute(BLOCK_ID_DATA_ATTR);
  if (!blockId) {
    return null;
  }

  const blockIndexRaw = block.getAttribute(BLOCK_INDEX_DATA_ATTR);
  const blockIndex =
    blockIndexRaw != null && blockIndexRaw !== "" ? Number(blockIndexRaw) : null;

  const plainText = getBlockPlainText(block);
  const startOffset = offsetBeforeNode(block, range.startContainer, range.startOffset);
  const endOffset = offsetBeforeNode(block, range.endContainer, range.endOffset);

  if (endOffset <= startOffset) {
    return null;
  }

  const quoteText = plainText.slice(startOffset, endOffset).trim();
  if (quoteText.length < INLINE_COMMENT_MIN_SELECTION_LENGTH) {
    return null;
  }

  if (quoteText.length > INLINE_COMMENT_QUOTE_MAX) {
    return null;
  }

  const prefixText = plainText.slice(Math.max(0, startOffset - 24), startOffset) || null;
  const suffixText = plainText.slice(endOffset, endOffset + 24) || null;

  return {
    blockId,
    blockIndex: Number.isFinite(blockIndex) ? blockIndex : null,
    startOffset,
    endOffset,
    quoteText: plainText.slice(startOffset, endOffset),
    prefixText,
    suffixText
  };
}

/** Paragraph-level anchor when selection is unavailable (mobile fallback). */
export function getParagraphAnchorFromBlock(block: HTMLElement): SelectionAnchorPayload | null {
  const blockId = block.getAttribute(BLOCK_ID_DATA_ATTR);
  if (!blockId) {
    return null;
  }

  const blockIndexRaw = block.getAttribute(BLOCK_INDEX_DATA_ATTR);
  const blockIndex =
    blockIndexRaw != null && blockIndexRaw !== "" ? Number(blockIndexRaw) : null;

  const plainText = getBlockPlainText(block).trim();
  if (plainText.length < INLINE_COMMENT_MIN_SELECTION_LENGTH) {
    return null;
  }

  const end = Math.min(plainText.length, INLINE_COMMENT_QUOTE_MAX);
  const quoteText = plainText.slice(0, end);

  return {
    blockId,
    blockIndex: Number.isFinite(blockIndex) ? blockIndex : null,
    startOffset: 0,
    endOffset: plainText.length,
    quoteText,
    prefixText: null,
    suffixText: plainText.length > end ? plainText.slice(end, end + 24) : null
  };
}

export function selectionSpansMultipleBlocks(range: Range) {
  const startBlock = findBlockElement(range.startContainer);
  const endBlock = findBlockElement(range.endContainer);
  return Boolean(startBlock && endBlock && startBlock !== endBlock);
}

export { buildComposerBlockId, buildLegacyParagraphBlockId as buildChapterTextBlockId };
