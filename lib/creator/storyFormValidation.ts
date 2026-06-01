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
  const taxonomy = parseStoryTaxonomyFormFields(formData);
  const visibilityInput = String(formData.get("visibility") ?? "private");
  const structureType = normalizeStoryStructureType(
    String(formData.get("structure_type") ?? "chaptered")
  );
  const intentInput = String(formData.get("intent") ?? "draft");
  const intent: StoryFormIntent =
    intentInput === "review"
      ? "review"
      : intentInput === "create_and_chapter"
        ? "create_and_chapter"
        : intentInput === "create"
          ? "create"
          : "draft";

  const normalizedSlug = slug ? normalizeStorySlugInput(slug) : "";

  if (!title) {
    return { ok: false, error: "Vui lòng nhập tiêu đề truyện." };
  }

  if (intent !== "draft") {
    if (!normalizedSlug) {
      return { ok: false, error: "Vui lòng nhập slug." };
    }

    if (!isUrlSafeSlug(normalizedSlug)) {
      return {
        ok: false,
        error: "Slug chỉ dùng chữ thường, số và dấu gạch ngang."
      };
    }

    const shortDescription = String(formData.get("short_description") ?? "").trim();
    if (!shortDescription) {
      return { ok: false, error: "Vui lòng nhập mô tả ngắn." };
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

    if (useTaxonomy && !taxonomy.contentWarningsConfirmed) {
      return {
        ok: false,
        error: "Vui lòng xác nhận cảnh báo nội dung."
      };
    }
  }

  if (intent === "review" && !hook) {
    return { ok: false, error: "Vui lòng nhập hook cho truyện." };
  }

  if (
    intent === "review" &&
    useTaxonomy &&
    !taxonomy.contentWarningsConfirmed
  ) {
    return {
      ok: false,
      error:
        "Vui lòng xác nhận cảnh báo nội dung (có hoặc không có) trước khi gửi duyệt."
    };
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

  if (intent === "review" && formData.get("guidelines_ack") !== "on") {
    return {
      ok: false,
      error:
        "Vui lòng xác nhận quyền đăng và tuân thủ Quy định cộng đồng trước khi gửi duyệt."
    };
  }

  const seoKeywords = parseSeoKeywordsField(formData);
  const keywordCheck = validateKeywordsList(seoKeywords);

  if (!keywordCheck.ok) {
    return { ok: false, error: keywordCheck.error };
  }

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
        visibilityInput === "public" || visibilityInput === "private"
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
      structureType
    }
  };
}
