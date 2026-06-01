import type { ChapterDraftContent, StoryDraftContent } from "@/types/drafts";

export function parseChapterDraftContent(
  content: Record<string, unknown> | null | undefined
): Partial<ChapterDraftContent> {
  if (!content) {
    return {};
  }

  return {
    content: typeof content.content === "string" ? content.content : undefined,
    composerDocument:
      content.composerDocument && typeof content.composerDocument === "object"
        ? (content.composerDocument as Record<string, unknown>)
        : undefined,
    episodeNumber:
      typeof content.episodeNumber === "number"
        ? content.episodeNumber
        : undefined,
    excerpt: typeof content.excerpt === "string" ? content.excerpt : undefined,
    presentationEditorMode:
      typeof content.presentationEditorMode === "string"
        ? content.presentationEditorMode
        : undefined,
    presentationSource:
      typeof content.presentationSource === "string"
        ? content.presentationSource
        : undefined,
    structuredContentJson:
      typeof content.structuredContentJson === "string"
        ? content.structuredContentJson
        : undefined,
    title: typeof content.title === "string" ? content.title : undefined,
    useComposerUi:
      typeof content.useComposerUi === "boolean" ? content.useComposerUi : undefined
  };
}

export function parseStoryDraftContent(
  content: Record<string, unknown> | null | undefined
): Partial<StoryDraftContent> {
  if (!content) {
    return {};
  }

  return {
    hook: typeof content.hook === "string" ? content.hook : undefined,
    longDescription:
      typeof content.longDescription === "string"
        ? content.longDescription
        : undefined,
    shortDescription:
      typeof content.shortDescription === "string"
        ? content.shortDescription
        : undefined,
    slug: typeof content.slug === "string" ? content.slug : undefined,
    title: typeof content.title === "string" ? content.title : undefined
  };
}

export function isDraftNewerThan(
  draftSavedAt: string | null | undefined,
  baselineUpdatedAt: string | null | undefined
) {
  if (!draftSavedAt) {
    return false;
  }

  if (!baselineUpdatedAt) {
    return true;
  }

  return new Date(draftSavedAt).getTime() > new Date(baselineUpdatedAt).getTime();
}
