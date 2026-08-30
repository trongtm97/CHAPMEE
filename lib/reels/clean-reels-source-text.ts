import { stripContentForSEO } from "@/lib/seo/extract-description";

const CHAPTER_END_NOISE = /\b(hết chương|còn tiếp|hết chap|to be continued)\b/gi;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function stripHtmlTags(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Làm sạch nội dung nguồn trước khi trích đoạn Reels. */
export function cleanReelsSourceText(value: string) {
  let text = stripContentForSEO(value)
    .replace(CHAPTER_END_NOISE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

const REELS_LEAD_IN_PREFIX =
  /^Đọc\s+(?:truyện|chương)\s+.+?\s*[:：]\s*/iu;

const REELS_LEAD_IN_ONLY =
  /^Đọc\s+(?:truyện|chương)\s+.+?\s*[:：]?\s*$/iu;

/** Bỏ dòng mở đầu kiểu "Đọc truyện {tên}:" — đã có ở CTA / tiêu đề nhóm. */
export function stripReelsLeadInText(value: string) {
  return value.trim().replace(REELS_LEAD_IN_PREFIX, "").trim();
}

export function isReelsLeadInOnly(value: string) {
  return REELS_LEAD_IN_ONLY.test(value.trim());
}

export function sanitizeReelsHookTitle(hookTitle: string, fallback: string) {
  const trimmedHook = decodeHtmlEntities(stripHtmlTags(hookTitle.trim()));

  if (!trimmedHook || isReelsLeadInOnly(trimmedHook)) {
    return decodeHtmlEntities(stripHtmlTags(fallback));
  }

  const strippedHook = stripReelsLeadInText(trimmedHook);

  return decodeHtmlEntities(stripHtmlTags(strippedHook || fallback));
}

export function sanitizeReelsExcerpt(excerpt: string) {
  return decodeHtmlEntities(stripHtmlTags(stripReelsLeadInText(excerpt)));
}

export function truncateReelsBodyAtBoundary(value: string, maxLength: number) {
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
