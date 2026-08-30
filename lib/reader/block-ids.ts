/**
 * Stable reader block IDs for inline comment anchors.
 *
 * Legacy prose/markdown: `{chapterId}:{contentHashPrefix}:p{index}`
 * Composer prose blocks: `{chapterId}:b:{composerBlockId}` (stable composer block.id)
 *
 * Limitation: legacy IDs change when content_hash changes → anchors become orphaned.
 * See docs/INLINE_COMMENTS_PLAN.md § orphan repair.
 */

export function contentHashPrefix(contentHash: string | null | undefined) {
  const normalized = String(contentHash ?? "").trim();
  return normalized.length >= 8 ? normalized.slice(0, 12) : "legacy";
}

export function buildLegacyParagraphBlockId(
  chapterId: string,
  blockIndex: number,
  contentHash: string | null | undefined
) {
  return `${chapterId}:${contentHashPrefix(contentHash)}:p${blockIndex}`;
}

export function buildComposerBlockId(chapterId: string, composerBlockId: string) {
  return `${chapterId}:b:${composerBlockId}`;
}

export const BLOCK_ID_DATA_ATTR = "data-block-id";
export const BLOCK_INDEX_DATA_ATTR = "data-block-index";
