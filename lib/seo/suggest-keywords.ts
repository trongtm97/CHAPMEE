import {
  SEO_KEYWORD_MAX_COUNT,
  SEO_KEYWORD_MAX_LENGTH
} from "@/types/seo";

const SYSTEM_KEYWORDS = ["đọc truyện", "truyện online", "ChapMee"] as const;

function normalizeKeyword(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEO_KEYWORD_MAX_LENGTH);
}

function isValidKeyword(value: string) {
  if (!value || value.length < 2) {
    return false;
  }

  if (!/[\p{L}]/u.test(value)) {
    return false;
  }

  if (/^[\d\W_]+$/.test(value)) {
    return false;
  }

  return true;
}

export function suggestStoryKeywords(input: {
  authorName?: string | null;
  genreName?: string | null;
  tagNames?: string[];
  title: string;
}) {
  const candidates = [
    input.title,
    input.authorName,
    input.genreName,
    ...(input.tagNames ?? []),
    ...SYSTEM_KEYWORDS
  ]
    .map((value) => normalizeKeyword(value ?? ""))
    .filter(isValidKeyword);

  return dedupeKeywords(candidates).slice(0, SEO_KEYWORD_MAX_COUNT);
}

export function suggestChapterKeywords(input: {
  authorName?: string | null;
  chapterTitle: string;
  genreName?: string | null;
  storyTitle: string;
  tagNames?: string[];
}) {
  const candidates = [
    input.chapterTitle,
    input.storyTitle,
    input.authorName,
    input.genreName,
    ...(input.tagNames ?? []),
    ...SYSTEM_KEYWORDS
  ]
    .map((value) => normalizeKeyword(value ?? ""))
    .filter(isValidKeyword);

  return dedupeKeywords(candidates).slice(0, SEO_KEYWORD_MAX_COUNT);
}

export function dedupeKeywords(keywords: string[]) {
  const seen = new Set<string>();

  return keywords.filter((keyword) => {
    const key = keyword.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function parseKeywordsInput(raw: string) {
  const parts = raw
    .split(/[,;\n]/)
    .map((part) => normalizeKeyword(part))
    .filter(isValidKeyword);

  return dedupeKeywords(parts).slice(0, SEO_KEYWORD_MAX_COUNT);
}

export function formatKeywordsInput(keywords: string[]) {
  return dedupeKeywords(keywords).join(", ");
}

export function validateKeywordsList(keywords: string[]) {
  if (keywords.length > SEO_KEYWORD_MAX_COUNT) {
    return {
      error: `Tối đa ${SEO_KEYWORD_MAX_COUNT} từ khóa.`,
      ok: false as const
    };
  }

  for (const keyword of keywords) {
    if (keyword.length > SEO_KEYWORD_MAX_LENGTH) {
      return {
        error: `Mỗi từ khóa tối đa ${SEO_KEYWORD_MAX_LENGTH} ký tự.`,
        ok: false as const
      };
    }

    if (!isValidKeyword(keyword)) {
      return {
        error: "Từ khóa không hợp lệ hoặc trùng lặp.",
        ok: false as const
      };
    }
  }

  return { ok: true as const };
}
