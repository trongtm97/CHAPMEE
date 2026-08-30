import { getCurrentStoryImage } from "@/lib/images/get-current-story-image";
import { createClient } from "@/lib/data/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";
import {
  getStoryFormTaxonomyBundle,
  type StoryFormTaxonomyBundle
} from "@/lib/creator/get-story-form-taxonomy";
import type { StoryStructureType } from "@/types/story-structure";
import type { StoryImage } from "@/types/story-images";
import type {
  ContentOrigin,
  TranslationType
} from "@/lib/content-origin/content-origin-types";

export type CreatorStoryFormStory = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  status: CreatorStoryStatus;
  visibility: "public" | "private";
  is_completed: boolean;
  age_rating: StoryAgeRating;
  sensitive_flags: SensitiveFlag[];
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  content_warnings_confirmed?: boolean;
  structureType: StoryStructureType;
  contentFormat: string | null;
  standalonePlainText: string | null;
  contentOrigin: ContentOrigin;
  translationType: TranslationType | null;
  rightsStatus: string | null;
  monetizationPolicy: string | null;
  sourceTitle: string | null;
  sourceAuthorName: string | null;
  originalLanguage: string | null;
  translatedLanguage: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  licenseNote: string | null;
  licenseDocumentMediaId: string | null;
};

export type StoryFormData = {
  taxonomy: StoryFormTaxonomyBundle;
  story: CreatorStoryFormStory | null;
  currentImage: StoryImage | null;
  error: string | null;
};

export async function getStoryFormData(
  creatorProfile: CreatorProfile,
  storyId?: string
): Promise<StoryFormData> {
  try {
    const db = await createClient();
    const taxonomy = await getStoryFormTaxonomyBundle(storyId);

    let story: CreatorStoryFormStory | null = null;
    let currentImage: StoryImage | null = null;

    if (storyId) {
      const { data: storyRow, error: storyError } = await db
        .from("stories")
        .select(
          "id, title, slug, public_code, hook, short_description, long_description, cover_url, status, visibility, is_completed, age_rating, sensitive_flags, seo_title, seo_description, seo_keywords, canonical_url, content_warnings_confirmed, structure_type, content_format, standalone_plain_text, content_origin, translation_type, rights_status, monetization_policy, source_title, source_author_name, original_language, translated_language, source_url, source_platform, license_note, license_document_media_id"
        )
        .eq("id", storyId)
        .eq("creator_id", creatorProfile.id)
        .maybeSingle();

      if (storyError) {
        throw storyError;
      }

      if (storyRow) {
        currentImage = (await getCurrentStoryImage(db, storyRow.id)).image;

        const coverUrl =
          currentImage?.portraitUrl ??
          currentImage?.originalUrl ??
          storyRow.cover_url ??
          null;

        story = {
          ...(storyRow as Omit<
            CreatorStoryFormStory,
            "cover_url" | "publicCode" | "structureType" | "contentFormat" | "standalonePlainText"
          >),
          cover_url: coverUrl,
          publicCode: (storyRow as { public_code: string }).public_code,
          structureType:
            (storyRow as { structure_type?: string }).structure_type === "standalone"
              ? "standalone"
              : "chaptered",
          contentFormat: (storyRow as { content_format?: string | null }).content_format ?? null,
          standalonePlainText:
            (storyRow as { standalone_plain_text?: string | null }).standalone_plain_text ?? null,
          contentOrigin:
            (storyRow as { content_origin?: string | null }).content_origin === "translation"
              ? "translation"
              : "original",
          translationType:
            ((storyRow as { translation_type?: TranslationType | null }).translation_type as
              | TranslationType
              | null) ?? null,
          rightsStatus: (storyRow as { rights_status?: string | null }).rights_status ?? null,
          monetizationPolicy:
            (storyRow as { monetization_policy?: string | null }).monetization_policy ?? null,
          sourceTitle: (storyRow as { source_title?: string | null }).source_title ?? null,
          sourceAuthorName:
            (storyRow as { source_author_name?: string | null }).source_author_name ?? null,
          originalLanguage:
            (storyRow as { original_language?: string | null }).original_language ?? null,
          translatedLanguage:
            (storyRow as { translated_language?: string | null }).translated_language ?? null,
          sourceUrl: (storyRow as { source_url?: string | null }).source_url ?? null,
          sourcePlatform:
            (storyRow as { source_platform?: string | null }).source_platform ?? null,
          licenseNote: (storyRow as { license_note?: string | null }).license_note ?? null,
          licenseDocumentMediaId:
            (storyRow as { license_document_media_id?: string | null }).license_document_media_id ??
            null
        };
      }
    }

    return {
      error: null,
      currentImage,
      taxonomy,
      story
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tải dữ liệu form.",
      currentImage: null,
      taxonomy: {
        enabled: false,
        optionsByType: {},
        selectedByType: {},
        presentationMode: "standard_prose",
        formatTemplatesByMode: {},
        selectedFormatTemplateId: null,
        contentWarningsConfirmed: false
      },
      story: null
    };
  }
}
