import {
  cleanReelsSourceText,
  truncateReelsBodyAtBoundary
} from "@/lib/reels/clean-reels-source-text";

const SNIPPET_MIN = 150;
const SNIPPET_MAX = 300;

function sliceSnippet(text: string, start: number, length = SNIPPET_MAX) {
  const normalized = cleanReelsSourceText(text);

  if (!normalized || normalized.length < 40) {
    return { end: 0, start: 0, text: "" };
  }

  const safeStart = Math.max(0, Math.min(start, normalized.length - 1));
  let end = Math.min(safeStart + length, normalized.length);

  if (end - safeStart < SNIPPET_MIN && normalized.length > SNIPPET_MIN) {
    end = Math.min(safeStart + SNIPPET_MAX, normalized.length);
  }

  let snippet = normalized.slice(safeStart, end).trim();

  if (snippet.length > SNIPPET_MAX) {
    snippet = truncateReelsBodyAtBoundary(snippet, SNIPPET_MAX);
  }

  return {
    end: safeStart + snippet.length,
    start: safeStart,
    text: snippet
  };
}

function stripRepeatedChapterTitle(text: string, chapterTitle?: string | null) {
  if (!chapterTitle?.trim()) {
    return text;
  }

  const title = chapterTitle.trim();
  const pattern = new RegExp(`^${escapeRegExp(title)}[\\s:–—-]*`, "i");

  return text.replace(pattern, "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractChapterOpening(
  content: string,
  chapterTitle?: string | null
) {
  const cleaned = stripRepeatedChapterTitle(
    cleanReelsSourceText(content),
    chapterTitle
  );
  const result = sliceSnippet(cleaned, 0);

  return {
    ...result,
    text: result.text
  };
}

export function extractDialogueSnippet(content: string) {
  const cleaned = cleanReelsSourceText(content);
  const dialogueMatch = cleaned.search(/["“][^"”]{8,}|:\s*["“][^"”]{4,}/);

  const start =
    dialogueMatch >= 0 ? Math.max(0, dialogueMatch - 40) : 0;

  return sliceSnippet(cleaned, start);
}

export function extractQuestionSnippet(content: string) {
  const cleaned = cleanReelsSourceText(content);
  const questionIndex = cleaned.indexOf("?");

  if (questionIndex < 0) {
    return { end: 0, start: 0, text: "" };
  }

  const before = cleaned.slice(0, questionIndex);
  const sentenceStarts = [
    before.lastIndexOf(". "),
    before.lastIndexOf("! "),
    before.lastIndexOf("? "),
    before.lastIndexOf("\n")
  ];
  const start = Math.max(0, Math.max(...sentenceStarts) + 1);
  const afterQuestion = cleaned.indexOf(".", questionIndex + 1);
  const end =
    afterQuestion > questionIndex
      ? afterQuestion + 1
      : Math.min(cleaned.length, questionIndex + SNIPPET_MAX);

  const text = cleaned.slice(start, end).trim();

  return {
    end: start + text.length,
    start,
    text: text.length > SNIPPET_MAX ? truncateReelsBodyAtBoundary(text, SNIPPET_MAX) : text
  };
}

export function extractChapterEnding(content: string) {
  const cleaned = cleanReelsSourceText(content);
  const start = Math.max(0, cleaned.length - SNIPPET_MAX);
  const result = sliceSnippet(cleaned, start, SNIPPET_MAX);

  return result;
}

export function extractStoryDescriptionSnippet(description: string) {
  const cleaned = cleanReelsSourceText(description);

  return sliceSnippet(cleaned, 0);
}
