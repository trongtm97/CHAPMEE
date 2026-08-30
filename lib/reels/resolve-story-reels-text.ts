import {
  cleanReelsSourceText,
  sanitizeReelsExcerpt
} from "@/lib/reels/clean-reels-source-text";
import { extractStoryDescriptionSnippet } from "@/lib/reels/extract-chapter-snippets";
import { createExcerpt } from "@/lib/text/createExcerpt";

/** ponytail: minimum cleaned long_description length to auto-surface in Reels feed */
export const STORY_REELS_LONG_DESC_MIN = 80;

export const STORY_REELS_LONG_DESC_AUTHOR_NOTE =
  "Truyện công khai có mô tả dài đủ nội dung sẽ tự động xuất hiện trong feed Reels — hệ thống trích một đoạn từ phần này. Bạn vẫn có thể tạo Reels thủ công nếu muốn tùy chỉnh thêm.";

export type StoryReelsTextFields = {
  title: string;
  hook?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
};

export function hasSubstantialStoryLongDescription(
  longDescription?: string | null
): boolean {
  return cleanReelsSourceText(longDescription ?? "").length >= STORY_REELS_LONG_DESC_MIN;
}

export function resolveStoryReelsExcerpt(input: StoryReelsTextFields): string {
  if (hasSubstantialStoryLongDescription(input.longDescription)) {
    const snippet = extractStoryDescriptionSnippet(input.longDescription!);
    if (snippet.text.length >= 40) {
      return sanitizeReelsExcerpt(snippet.text);
    }
  }

  const shortDescription = input.shortDescription?.replace(/\s+/g, " ").trim() ?? "";
  if (shortDescription) {
    return sanitizeReelsExcerpt(createExcerpt(shortDescription, 80, 160));
  }

  const hook = input.hook?.replace(/\s+/g, " ").trim() ?? "";
  if (hook) {
    return sanitizeReelsExcerpt(hook);
  }

  return `Khám phá truyện "${input.title}" trên ChapMee.`;
}

export function suggestStoryReelsDraft(input: StoryReelsTextFields): {
  hook: string;
  body: string;
} | null {
  if (!hasSubstantialStoryLongDescription(input.longDescription)) {
    return null;
  }

  const snippet = extractStoryDescriptionSnippet(input.longDescription!);
  if (snippet.text.length < 40) {
    return null;
  }

  const hook =
    input.hook?.trim() ||
    (input.title.length > 80 ? `${input.title.slice(0, 77).trim()}…` : input.title);

  return { hook, body: snippet.text };
}

if (process.env.CHAPMEE_ASSERT_STORY_REELS_TEXT === "1") {
  const long = "A".repeat(120);
  console.assert(hasSubstantialStoryLongDescription(long));
  console.assert(resolveStoryReelsExcerpt({ title: "T", longDescription: long }).length >= 40);
}
