import { createEmptyStructuredContent } from "@/lib/composer/templates";
import {
  composerDocumentToJson,
  isComposerStructuredDocument,
  legacyContentToProseDocument,
  parseComposerDocument,
  tryParseStoredComposerDocument
} from "@/lib/composer/serializer";
import { migrateLegacyStructuredToComposer } from "@/lib/composer/migrate-legacy-to-composer";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import type { ComposerMode, ComposerStructuredContent } from "@/lib/composer/types";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import { modeUsesStructuredContent } from "@/lib/presentation/constants";

export type ChapterPresentationSource =
  | "story"
  | "standard_prose"
  | PresentationMode;

export function resolveChapterComposerMode(
  source: ChapterPresentationSource,
  storyMode: PresentationMode,
  chapterMode: string | null | undefined
): ComposerMode {
  if (source === "story") {
    return presentationModeToComposerMode(
      resolveEffectivePresentationMode({
        storyMode,
        chapterMode: chapterMode ?? null
      })
    );
  }
  if (source === "standard_prose") {
    return "standard_prose";
  }
  return presentationModeToComposerMode(source);
}

export function shouldUseStudioComposer(input: {
  composerMode: ComposerMode;
  contentFormat: ContentFormat | null | undefined;
  structuredContent?: unknown | null;
  useComposerUi: boolean;
}): boolean {
  if (input.useComposerUi) {
    return true;
  }
  if (input.contentFormat === "structured_blocks") {
    return true;
  }
  if (
    input.structuredContent != null &&
    tryParseStoredComposerDocument(input.structuredContent).ok
  ) {
    return true;
  }
  return (
    modeUsesStructuredContent(input.composerMode as PresentationMode) &&
    input.composerMode !== "standard_prose"
  );
}

export function buildInitialComposerDocument(input: {
  mode: ComposerMode;
  structuredContent: unknown | null;
  fallbackContent: string;
  contentFormat: ContentFormat | null | undefined;
}): ComposerStructuredContent {
  if (input.structuredContent != null) {
    const stored = tryParseStoredComposerDocument(input.structuredContent);
    if (stored.ok) {
      return stored.data;
    }
  }

  if (isComposerStructuredDocument(input.structuredContent)) {
    const parsed = parseComposerDocument(input.structuredContent);
    if (parsed.ok) {
      return parsed.data;
    }
  }

  if (
    input.structuredContent != null &&
    input.contentFormat === "structured_json"
  ) {
    const migrated = migrateLegacyStructuredToComposer(
      input.mode as PresentationMode,
      input.structuredContent
    );
    if (migrated) {
      return migrated;
    }
  }

  if (input.fallbackContent.trim()) {
    return legacyContentToProseDocument(input.fallbackContent, input.mode);
  }

  return createEmptyStructuredContent(input.mode);
}

export function composerValueToHiddenJson(value: ComposerStructuredContent): string {
  return composerDocumentToJson(value);
}

export function convertProseChapterToComposer(
  content: string,
  mode: ComposerMode
): ComposerStructuredContent {
  return legacyContentToProseDocument(content, mode);
}

export function composerDocumentToPlainFallback(
  doc: ComposerStructuredContent
): string {
  const parts: string[] = [];

  for (const block of doc.blocks) {
    if (block.type === "prose" && block.data.text.trim()) {
      parts.push(block.data.text.trim());
    } else if (block.type === "heading" && block.data.text.trim()) {
      parts.push(block.data.text.trim());
    } else if (block.type === "diary_entry" && block.data.content.trim()) {
      parts.push(block.data.content.trim());
    } else if (block.type === "chat_message" && block.data.text.trim()) {
      parts.push(`${block.data.character_name}: ${block.data.text.trim()}`);
    }
  }

  return parts.join("\n\n") || "Nội dung chương theo định dạng cấu trúc.";
}
