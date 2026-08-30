import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { verifyChapterMediaIdsForPublish } from "@/lib/images/verify-chapter-media-for-publish";
import { mergeComposerPlainWithImages } from "@/lib/composer/composer-document-to-rich-content";
import { runEpisodeComposerValidation } from "@/lib/composer/publish-validation";
import { resolveKnownComposerMediaIds } from "@/lib/composer/verify-composer-media";
import { getComposerAdminSettings } from "@/lib/composer/composer-settings";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { EpisodeComposerValidationPayload } from "@/lib/composer/publish-validation";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";
import {
  assertStructuredContentSafeForPersist,
  LOCAL_MEDIA_URL_ERROR,
  validatePlainChapterContent
} from "@/lib/media/content-media-validator";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import type { DatabaseClient } from "@/lib/db/types";

export type ComposerEpisodePersistFields = EpisodeComposerValidationPayload & {
  content: string;
  composer_version?: number;
};

export async function resolveComposerEpisodePersistFields(
  db: DatabaseClient,
  input: {
    content: string;
    contentFormat: ContentFormat | null;
    presentationMode: PresentationMode;
    structuredContent: unknown | null;
    storyId: string;
    strictPublish?: boolean;
    storyContentWarningsConfirmed?: boolean;
    previewViewed?: boolean;
  }
): Promise<ComposerEpisodePersistFields> {
  const plainCheck = validatePlainChapterContent(input.content);
  if (!plainCheck.ok) {
    return {
      content: input.content,
      validation_status: "invalid",
      validation_errors: [
        { severity: "error", code: "LOCAL_MEDIA_URL", message: plainCheck.error }
      ],
      last_validated_at: new Date().toISOString()
    };
  }

  try {
    assertStructuredContentSafeForPersist(input.structuredContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : LOCAL_MEDIA_URL_ERROR;
    return {
      content: input.content,
      validation_status: "invalid",
      validation_errors: [{ severity: "error", code: "LOCAL_MEDIA_URL", message }],
      last_validated_at: new Date().toISOString()
    };
  }

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

  if (
    input.contentFormat !== "structured_blocks" ||
    !isComposerStructuredDocument(input.structuredContent)
  ) {
    return { content: input.content, ...validation };
  }

  const doc = input.structuredContent as ComposerStructuredContent;

  if (input.strictPublish) {
    const mediaIds = collectMediaIdsFromComposer(doc);
    const mediaCheck = await verifyChapterMediaIdsForPublish(
      db,
      mediaIds,
      input.storyId
    );
    if (!mediaCheck.ok) {
      return {
        content: input.content,
        validation_status: "invalid",
        validation_errors: [
          { severity: "error", code: "IMAGE_MEDIA_INVALID", message: mediaCheck.message }
        ],
        last_validated_at: new Date().toISOString()
      };
    }
  }
  const imageIds = collectMediaIdsFromComposer(doc);
  const imageMap = await getChapterImagesMap(db, imageIds);
  const content = mergeComposerPlainWithImages(doc, imageMap, input.content);

  return {
    content,
    composer_version: 1,
    ...validation
  };
}
