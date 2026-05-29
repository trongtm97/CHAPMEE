import { stripContentForSEO } from "@/lib/seo/extract-description";

const CHAPTER_END_NOISE = /\b(hết chương|còn tiếp|hết chap|to be continued)\b/gi;

/** Làm sạch nội dung nguồn trước khi trích đoạn Swipe. */
export function cleanSwipeSourceText(value: string) {
  let text = stripContentForSEO(value)
    .replace(CHAPTER_END_NOISE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function truncateSwipeBodyAtBoundary(value: string, maxLength: number) {
  const text = value.trim();

  if (text.length <= maxLength) {
    return text;
  }

  const slice = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?"),
    slice.lastIndexOf("…")
  );

  if (sentenceEnd > maxLength * 0.5) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    return `${slice.slice(0, lastSpace).trim()}…`;
  }

  return `${slice.trimEnd()}…`;
}
