import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { mergeComposerPlainWithImages } from "@/lib/composer/composer-document-to-rich-content";
import { runEpisodeComposerValidation } from "@/lib/composer/publish-validation";
import { resolveKnownComposerMediaIds } from "@/lib/composer/verify-composer-media";
import { getComposerAdminSettings } from "@/lib/composer/composer-settings";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";
import {
  countWords,
  estimateReadingTimeMinutes,
  isStandaloneStory
} from "@/lib/stories/story-structure";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import type { DatabaseClient } from "@/lib/db/types";

export type StandaloneContentPersistResult = {
  standalone_content_json: unknown | null;
  standalone_plain_text: string;
  standalone_word_count: number;
  standalone_reading_time_minutes: number;
  content_format: string | null;
  validation_status: string | null;
  validation_errors: unknown;
  standalone_updated_at: string;
};

export async function resolveStandaloneStoryContentPersist(
  db: DatabaseClient,
  input: {
    storyId: string;
    content: string;
    contentFormat: ContentFormat | null;
    presentationMode: PresentationMode;
    structuredContent: unknown | null;
    strictPublish?: boolean;
    storyContentWarningsConfirmed?: boolean;
    previewViewed?: boolean;
  }
): Promise<StandaloneContentPersistResult> {
  const knownMediaIds =
    input.contentFormat === "structured_blocks"
      ? await resolveKnownComposerMediaIds(
          db,
          input.structuredContent,
          input.storyId
        )
      : new Set<string>();

  const adminSettings = await getComposerAdminSettings();

  const validation = await runEpisodeComposerValidation({
    contentFormat: input.contentFormat,
    presentationMode: input.presentationMode,
    structuredContent: input.structuredContent,
    options: {
      knownMediaIds,
      adminSettings,
      strictPublish: input.strictPublish ?? false,
      storyContentWarningsConfirmed: input.storyContentWarningsConfirmed,
      previewViewed: input.previewViewed
    }
  });

  let plainText = input.content.trim();
  let structuredJson: unknown | null =
    input.contentFormat === "structured_blocks" ? input.structuredContent : null;

  if (
    input.contentFormat === "structured_blocks" &&
    isComposerStructuredDocument(input.structuredContent)
  ) {
    const doc = input.structuredContent as ComposerStructuredContent;
    const imageIds = collectMediaIdsFromComposer(doc);
    const imageMap = await getChapterImagesMap(db, imageIds);
    plainText = mergeComposerPlainWithImages(doc, imageMap, input.content);
    structuredJson = doc;
  }

  const wordCount = countWords(plainText);
  const readingTime = estimateReadingTimeMinutes(wordCount);

  return {
    standalone_content_json: structuredJson,
    standalone_plain_text: plainText,
    standalone_word_count: wordCount,
    standalone_reading_time_minutes: readingTime,
    content_format: input.contentFormat,
    validation_status: validation.validation_status ?? null,
    validation_errors: validation.validation_errors ?? [],
    standalone_updated_at: new Date().toISOString()
  };
}

export function parseStandaloneContentFromForm(formData: FormData): {
  content: string;
  contentFormat: ContentFormat | null;
  presentationMode: PresentationMode;
  structuredContent: unknown | null;
} {
  const content = String(formData.get("standalone_content") ?? "").trim();
  const contentFormatRaw = String(formData.get("standalone_content_format") ?? "").trim();
  const presentationMode = String(
    formData.get("standalone_presentation_mode") ?? "standard_prose"
  ).trim() as PresentationMode;
  const structuredRaw = String(formData.get("standalone_structured_content_json") ?? "").trim();

  let structuredContent: unknown | null = null;
  if (structuredRaw) {
    try {
      structuredContent = JSON.parse(structuredRaw) as unknown;
    } catch {
      structuredContent = null;
    }
  }

  const contentFormat = contentFormatRaw
    ? (contentFormatRaw as ContentFormat)
    : structuredContent
      ? ("structured_blocks" as ContentFormat)
      : ("plain_text" as ContentFormat);

  return { content, contentFormat, presentationMode, structuredContent };
}

export function assertStoryIsStandalone(structureType: string | null | undefined) {
  if (!isStandaloneStory({ structureType: structureType === "standalone" ? "standalone" : "chaptered" })) {
    throw new Error("Truyện này không phải truyện một phần.");
  }
}
