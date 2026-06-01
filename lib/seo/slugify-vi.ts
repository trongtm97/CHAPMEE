import { normalizeVietnameseSlug } from "@/lib/seo/slug";
import { SEO_SLUG_MAX_LENGTH } from "@/types/seo";

export { isUrlSafeSlug } from "@/lib/slugify";
export { normalizeVietnameseSlug, validateSeoSlug, isValidSeoSlug } from "@/lib/seo/slug";

/** Slug tiếng Việt không dấu, tối đa 80 ký tự. */
export function slugifyVietnamese(input: string, maxLength = SEO_SLUG_MAX_LENGTH) {
  return normalizeVietnameseSlug(input, maxLength);
}

export function appendSlugSuffix(base: string, suffix: number) {
  const trimmed = base.replace(/-+$/g, "");
  const candidate = `${trimmed}-${suffix}`;

  return candidate.slice(0, SEO_SLUG_MAX_LENGTH).replace(/-+$/g, "");
}
