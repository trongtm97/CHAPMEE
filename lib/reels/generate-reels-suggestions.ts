import {
  extractChapterEnding,
  extractChapterOpening,
  extractDialogueSnippet,
  extractQuestionSnippet,
  extractStoryDescriptionSnippet
} from "@/lib/reels/extract-chapter-snippets";
import type { ReelsSourceType, ReelsSuggestionResult } from "@/types/reels";

export type ChapterSuggestionInput = {
  content: string;
  chapterTitle?: string | null;
  storyTitle?: string | null;
};

export function generateReelsSuggestionsFromChapter(
  chapter: ChapterSuggestionInput
): Record<
  Exclude<ReelsSourceType, "manual" | "manual_selection" | "story_description">,
  ReelsSuggestionResult | null
> {
  const opening = extractChapterOpening(chapter.content, chapter.chapterTitle);
  const dialogue = extractDialogueSnippet(chapter.content);
  const question = extractQuestionSnippet(chapter.content);
  const ending = extractChapterEnding(chapter.content);

  const defaultHook =
    chapter.chapterTitle?.trim() ||
    chapter.storyTitle?.trim() ||
    opening.text.split(/\s+/).slice(0, 8).join(" ");

  function build(
    body: string,
    sourceType: ReelsSourceType,
    start: number,
    end: number
  ): ReelsSuggestionResult | null {
    if (!body || body.length < 40) {
      return null;
    }

    const hook =
      defaultHook.length > 80 ? `${defaultHook.slice(0, 77).trim()}…` : defaultHook;

    return {
      body,
      hook,
      sourceTextEnd: end,
      sourceTextStart: start,
      sourceType
    };
  }

  return {
    chapter_start: build(
      opening.text,
      "chapter_start",
      opening.start,
      opening.end
    ),
    dialogue: build(dialogue.text, "dialogue", dialogue.start, dialogue.end),
    ending: build(ending.text, "ending", ending.start, ending.end),
    question: build(question.text, "question", question.start, question.end)
  };
}

export function generateReelsSuggestionFromStoryDescription(input: {
  description: string;
  storyTitle: string;
}): ReelsSuggestionResult | null {
  const snippet = extractStoryDescriptionSnippet(input.description);

  if (!snippet.text || snippet.text.length < 40) {
    return null;
  }

  const hook =
    input.storyTitle.length > 80
      ? `${input.storyTitle.slice(0, 77).trim()}…`
      : input.storyTitle;

  return {
    body: snippet.text,
    hook,
    sourceTextEnd: snippet.end,
    sourceTextStart: snippet.start,
    sourceType: "story_description"
  };
}
