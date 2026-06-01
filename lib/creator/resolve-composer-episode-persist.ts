import { collectMediaIdsFromComposer } from "@/lib/composer/collect-media-ids";
import { mergeComposerPlainWithImages } from "@/lib/composer/composer-document-to-rich-content";
import { runEpisodeComposerValidation } from "@/lib/composer/publish-validation";
import { resolveKnownComposerMediaIds } from "@/lib/composer/verify-composer-media";
import { getComposerAdminSettings } from "@/lib/composer/composer-settings";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import type { EpisodeComposerValidationPayload } from "@/lib/composer/publish-validation";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import { getChapterImagesMap } from "@/lib/images/get-chapter-images-map";
import type { ContentFormat, PresentationMode } from "@/types/presentation";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ComposerEpisodePersistFields = EpisodeComposerValidationPayload & {
  content: string;
  composer_version?: number;
};

export async function resolveComposerEpisodePersistFields(
  supabase: SupabaseClient,
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
  const knownMediaIds =
    input.contentFormat === "structured_blocks"
      ? await resolveKnownComposerMediaIds(
          supabase,
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
  const imageIds = collectMediaIdsFromComposer(doc);
  const imageMap = await getChapterImagesMap(supabase, imageIds);
  const content = mergeComposerPlainWithImages(doc, imageMap, input.content);

  return {
    content,
    composer_version: 1,
    ...validation
  };
}
