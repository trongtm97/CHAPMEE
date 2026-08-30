import {
  parseCanonicalUrlField,
  parseSeoDescriptionField,
  parseSeoKeywordsField,
  parseSeoTitleField
} from "@/lib/seo/parse-seo-form";
import { validateKeywordsList } from "@/lib/seo/suggest-keywords";
import { isUrlSafeSlug } from "@/lib/slugify";
import { parseStoryTaxonomyFormFields } from "@/lib/creator/parse-story-taxonomy-form";
import { normalizeStorySlugInput } from "@/lib/creator/resolve-unique-story-slug";
import { normalizeStoryStructureType } from "@/lib/stories/story-structure";
import {
  CONTENT_ORIGIN_VALUES,
  type ContentOrigin,
  type StoryMonetizationPolicy,
  type TranslationType
} from "@/lib/content-origin/content-origin-types";
import { resolveTranslationFormDefaults } from "@/lib/creator/story-translation-defaults";
import { isKnownStorySourceLanguage } from "@/lib/creator/story-source-languages";
import {
  isValidSourceUrl,
  normalizeSourceUrl,
  SOURCE_URL_VALIDATION_MESSAGE
} from "@/lib/creator/validate-source-url";
import type { ParsedStoryTaxonomyForm } from "@/lib/creator/parse-story-taxonomy-form";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";
import type { StoryStructureType } from "@/types/story-structure";

export type StoryFormIntent =
  | "draft"
  | "create"
  | "create_and_chapter"
  | "review";

export type StoryFormValues = {
  title: string;
  slug: string;
  hook: string;
  shortDescription: string | null;
  longDescription: string | null;
  coverUrl: string | null;
  isCompleted: boolean;
  visibility: "public" | "private";
  intent: StoryFormIntent;
  ageRating: StoryAgeRating;
  sensitiveFlags: SensitiveFlag[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
  useTaxonomy: boolean;
  taxonomy: ParsedStoryTaxonomyForm;
  structureType: StoryStructureType;
  contentOrigin: ContentOrigin;
  translationType: TranslationType | null;
  sourceTitle: string | null;
  sourceAuthorName: string | null;
  originalLanguage: string | null;
  translatedLanguage: string | null;
  sourceUrl: string | null;
  sourcePlatform: string | null;
  licenseNote: string | null;
  licenseDocumentMediaId: string | null;
  rightsStatus: "pending_review" | "unverified";
  monetizationPolicy: StoryMonetizationPolicy;
};

const AGE_RATINGS = new Set<StoryAgeRating>([
  "all_ages",
  "teen_13",
  "young_adult_16",
  "mature_18"
]);

const SENSITIVE_FLAGS = new Set<SensitiveFlag>([
  "violence",
  "horror",
  "strong_language",
  "sexual_themes",
  "self_harm_theme",
  "substance_use",
  "abuse_theme"
]);

export type StoryFormValidationResult =
  | {
      ok: true;
      values: StoryFormValues;
    }
  | {
      ok: false;
      error: string;
    };

export function parseStoryFormData(
  formData: FormData
): StoryFormValidationResult {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const hook = String(formData.get("hook") ?? "").trim();
  const useTaxonomy = formData.get("use_taxonomy") === "1";
  const taxonomy = {
    ...parseStoryTaxonomyFormFields(formData),
    contentWarningsConfirmed: true
  };
  const visibilityInput = String(formData.get("visibility") ?? "private");
  const structureType = normalizeStoryStructureType(
    String(formData.get("structure_type") ?? "chaptered")
  );
  const intentInput = String(formData.get("intent") ?? "draft");
  const contentOriginInput = String(formData.get("content_origin") ?? "").trim();
  const contentOrigin: ContentOrigin = CONTENT_ORIGIN_VALUES.includes(
    contentOriginInput as ContentOrigin
  )
    ? (contentOriginInput as ContentOrigin)
    : "original";
  const intent: StoryFormIntent =
    intentInput === "review"
      ? "review"
      : intentInput === "create_and_chapter"
        ? "create_and_chapter"
        : intentInput === "create"
          ? "create"
          : "draft";

  const normalizedSlug = slug ? normalizeStorySlugInput(slug) : "";
  const isPublishing = intent === "review" || intent === "create" || intent === "create_and_chapter";

  if (!title) {
    return { ok: false, error: "Vui lòng nhập tiêu đề truyện." };
  }

  if (isPublishing) {
    if (!contentOriginInput) {
      return {
        ok: false,
        error: "Vui lòng chọn loại nội dung: Truyện Sáng Tác hoặc Truyện Dịch."
      };
    }

    if (!CONTENT_ORIGIN_VALUES.includes(contentOriginInput as ContentOrigin)) {
      return { ok: false, error: "Loại nội dung không hợp lệ." };
    }
  }

  if (isPublishing) {
    if (!normalizedSlug) {
      return { ok: false, error: "Vui lòng nhập slug." };
    }

    if (!isUrlSafeSlug(normalizedSlug)) {
      return {
        ok: false,
        error: "Slug chỉ dùng chữ thường, số và dấu gạch ngang."
      };
    }

    if (!useTaxonomy) {
      return {
        ok: false,
        error: "Hệ thống taxonomy chưa sẵn sàng. Liên hệ quản trị viên."
      };
    }

    if (useTaxonomy && taxonomy.taxonomyTermIds.length === 0) {
      return {
        ok: false,
        error: "Vui lòng chọn loại nội dung và thể loại chính (taxonomy)."
      };
    }

    if (useTaxonomy && !taxonomy.presentationMode) {
      return {
        ok: false,
        error: "Vui lòng chọn cách trình bày (presentation mode)."
      };
    }
  }

  const ageRatingInput = String(formData.get("age_rating") ?? "all_ages");
  const ageRating = AGE_RATINGS.has(ageRatingInput as StoryAgeRating)
    ? (ageRatingInput as StoryAgeRating)
    : "all_ages";

  const sensitiveFlags = formData
    .getAll("sensitive_flags")
    .map(String)
    .filter((flag): flag is SensitiveFlag =>
      SENSITIVE_FLAGS.has(flag as SensitiveFlag)
    );

  const seoKeywords = parseSeoKeywordsField(formData);
  if (intent !== "draft") {
    const keywordCheck = validateKeywordsList(seoKeywords);
    if (!keywordCheck.ok) {
      return { ok: false, error: keywordCheck.error };
    }
  }

  const sourceTitle = String(formData.get("source_title") ?? "").trim();
  const sourceAuthorName = String(formData.get("source_author_name") ?? "").trim();
  const originalLanguage = String(formData.get("original_language") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const translationDefaults = resolveTranslationFormDefaults({
    translatedLanguage: String(formData.get("translated_language") ?? ""),
    translationType: String(formData.get("translation_type") ?? ""),
    sourcePlatform: String(formData.get("source_platform") ?? ""),
    licenseNote: String(formData.get("license_note") ?? ""),
    licenseDocumentMediaId: String(formData.get("license_document_media_id") ?? "")
  });

  if (contentOrigin === "translation" && isPublishing) {
    if (!originalLanguage) {
      return { ok: false, error: "Vui lòng chọn Ngôn ngữ gốc." };
    }
    if (
      !isKnownStorySourceLanguage(originalLanguage) &&
      originalLanguage.trim().length < 2
    ) {
      return { ok: false, error: "Vui lòng nhập tên ngôn ngữ khác (ít nhất 2 ký tự)." };
    }
    if (!sourceUrl) {
      return { ok: false, error: "Vui lòng nhập Nguồn đăng gốc / source URL." };
    }
    if (!isValidSourceUrl(sourceUrl)) {
      return { ok: false, error: SOURCE_URL_VALIDATION_MESSAGE };
    }
  }

  const normalizedSourceUrl =
    contentOrigin === "translation" && sourceUrl ? normalizeSourceUrl(sourceUrl) : null;

  return {
    ok: true,
    values: {
      title,
      slug: normalizedSlug || normalizeStorySlugInput(title),
      hook,
      shortDescription:
        String(formData.get("short_description") ?? "").trim() || null,
      longDescription:
        String(formData.get("long_description") ?? "").trim() || null,
      coverUrl: String(formData.get("cover_url") ?? "").trim() || null,
      isCompleted: formData.get("is_completed") === "on",
      visibility:
        intent === "review"
          ? "public"
          : visibilityInput === "public" || visibilityInput === "private"
            ? visibilityInput
            : "private",
      intent,
      ageRating,
      sensitiveFlags,
      seoTitle: parseSeoTitleField(formData) || null,
      seoDescription: parseSeoDescriptionField(formData) || null,
      seoKeywords,
      canonicalUrl: parseCanonicalUrlField(formData),
      useTaxonomy,
      taxonomy,
      structureType,
      contentOrigin,
      translationType:
        contentOrigin === "translation" ? translationDefaults.translationType : null,
      sourceTitle: contentOrigin === "translation" ? sourceTitle : null,
      sourceAuthorName: contentOrigin === "translation" ? sourceAuthorName : null,
      originalLanguage: contentOrigin === "translation" ? originalLanguage : null,
      translatedLanguage:
        contentOrigin === "translation" ? translationDefaults.translatedLanguage : null,
      sourceUrl: contentOrigin === "translation" ? normalizedSourceUrl : null,
      sourcePlatform:
        contentOrigin === "translation" ? translationDefaults.sourcePlatform : null,
      licenseNote: contentOrigin === "translation" ? translationDefaults.licenseNote : null,
      licenseDocumentMediaId:
        contentOrigin === "translation"
          ? translationDefaults.licenseDocumentMediaId
          : null,
      rightsStatus: contentOrigin === "translation" ? "pending_review" : "unverified",
      monetizationPolicy: contentOrigin === "translation" ? "free_only" : "full"
    }
  };
}
