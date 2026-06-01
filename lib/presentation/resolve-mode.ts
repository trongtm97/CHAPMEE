import { isPresentationMode } from "@/lib/presentation/constants";
import type { PresentationMode } from "@/types/presentation";

export function resolveEffectivePresentationMode(input: {
  chapterMode?: string | null;
  storyMode?: string | null;
}): PresentationMode {
  const chapter = input.chapterMode?.trim();
  if (chapter && isPresentationMode(chapter)) {
    return chapter;
  }

  const story = input.storyMode?.trim();
  if (story && isPresentationMode(story)) {
    return story;
  }

  return "standard_prose";
}
