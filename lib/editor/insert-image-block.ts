import {
  buildChapterImageBlockToken,
  insertChapterImageBlockAtCursor
} from "@/lib/editor/chapter-image-block";
import type { ChapterImageBlock } from "@/types/chapter-images";

export function insertImageBlockIntoContent(input: {
  content: string;
  block: ChapterImageBlock;
  selectionEnd: number;
  selectionStart: number;
}) {
  const token = buildChapterImageBlockToken(input.block);

  return insertChapterImageBlockAtCursor({
    content: input.content,
    selectionEnd: input.selectionEnd,
    selectionStart: input.selectionStart,
    token
  });
}
