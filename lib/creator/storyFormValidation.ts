import {
  parseCanonicalUrlField,
  parseSeoDescriptionField,
  parseSeoKeywordsField,
  parseSeoTitleField
} from "@/lib/seo/parse-seo-form";
import { validateKeywordsList } from "@/lib/seo/suggest-keywords";
import { isUrlSafeSlug } from "@/lib/slugify";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";

export type StoryFormValues = {
  title: string;
  slug: string;
  hook: string;
  shortDescription: string | null;
  longDescription: string | null;
  coverUrl: string | null;
  genreId: string;
  tagIds: string[];
  isCompleted: boolean;
  visibility: "public" | "private";
  intent: "draft" | "review";
  ageRating: StoryAgeRating;
  sensitiveFlags: SensitiveFlag[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  canonicalUrl: string | null;
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
  const genreId = String(formData.get("genre_id") ?? "").trim();
  const visibilityInput = String(formData.get("visibility") ?? "private");
  const intentInput = String(formData.get("intent") ?? "draft");

  if (!title) {
    return { ok: false, error: "Vui lòng nhập tiêu đề truyện." };
  }

  if (!slug) {
    return { ok: false, error: "Vui lòng nhập slug." };
  }

  if (!isUrlSafeSlug(slug)) {
    return {
      ok: false,
      error: "Slug chỉ dùng chữ thường, số và dấu gạch ngang."
    };
  }

  if (!hook) {
    return { ok: false, error: "Vui lòng nhập hook cho truyện." };
  }

  if (!genreId) {
    return { ok: false, error: "Vui lòng chọn thể loại." };
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

  const intent = intentInput === "review" ? "review" : "draft";

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
      slug,
      hook,
      shortDescription:
        String(formData.get("short_description") ?? "").trim() || null,
      longDescription:
        String(formData.get("long_description") ?? "").trim() || null,
      coverUrl: String(formData.get("cover_url") ?? "").trim() || null,
      genreId,
      tagIds: formData.getAll("tags").map(String),
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
      canonicalUrl: parseCanonicalUrlField(formData)
    }
  };
}
