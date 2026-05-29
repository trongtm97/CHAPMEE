import type { ChapterRange } from "@/types/chapter";

export const CHAPTER_PAGE_SIZE = 50;
export const SHORT_STORY_CHAPTER_THRESHOLD = 30;

export function buildChapterRanges(
  totalChapters: number,
  pageSize = CHAPTER_PAGE_SIZE
): ChapterRange[] {
  if (totalChapters <= 0) {
    return [];
  }

  const ranges: ChapterRange[] = [];
  for (let start = 1; start <= totalChapters; start += pageSize) {
    const end = Math.min(start + pageSize - 1, totalChapters);
    ranges.push({ start, end, label: `${start}–${end}` });
  }
  return ranges;
}

export function rangeForChapterNumber(
  episodeNumber: number,
  totalChapters: number,
  pageSize = CHAPTER_PAGE_SIZE
): ChapterRange {
  const start = Math.floor((episodeNumber - 1) / pageSize) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalChapters);
  return { start, end, label: `${start}–${end}` };
}

export function parseRangeParam(value: string | null | undefined): ChapterRange | null {
  if (!value) {
    return null;
  }

  const match = /^(\d+)-(\d+)$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return null;
  }

  return { start, end, label: `${start}–${end}` };
}
