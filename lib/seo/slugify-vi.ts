import { isUrlSafeSlug, slugify } from "@/lib/slugify";
import { SEO_SLUG_MAX_LENGTH } from "@/types/seo";

export { isUrlSafeSlug };

/** Slug tiếng Việt không dấu, tối đa 80 ký tự. */
export function slugifyVietnamese(input: string, maxLength = SEO_SLUG_MAX_LENGTH) {
  return slugify(input).slice(0, maxLength).replace(/-+$/g, "");
}

export function appendSlugSuffix(base: string, suffix: number) {
  const trimmed = base.replace(/-+$/g, "");
  const candidate = `${trimmed}-${suffix}`;

  return candidate.slice(0, SEO_SLUG_MAX_LENGTH).replace(/-+$/g, "");
}
